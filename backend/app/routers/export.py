from pathlib import Path
import zipfile
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.core.config import settings
import fitz
import json
import tempfile
from typing import List

from app.schemas.uploaded_file import ExportRequest

router = APIRouter(prefix="/export", tags=["Export"])

DEBUG = False

def debug_print(*args):
    if DEBUG:
        print(*args)

# Eraser detection configuration
ERASER_MIN_WIDTH_PERCENT = 0.8
ERASER_MAX_WIDTH_PERCENT = 4.0
ERASER_DEFAULT_WIDTH_PERCENT = 1.5
ERASER_SCALE_FACTOR = 0.7
ASSUMED_PAGE_WIDTH_PX = 600

# =========================
# Helpers and geometry
# =========================

def hex_to_rgb(color):
    NAMED_COLORS = {
        "black": "#000000",
        "white": "#ffffff",
        "red": "#ff0000",
        "green": "#00ff00",
        "blue": "#0000ff",
        "yellow": "#ffff00",
        "cyan": "#00ffff",
        "magenta": "#ff00ff",
    }
    if not color.startswith("#"):
        color = NAMED_COLORS.get(color.lower(), "#000000")
    color = color.lstrip("#")
    return tuple(int(color[i : i + 2], 16) / 255 for i in (0, 2, 4))


def percentage_to_pdf_coords(x_percent, y_percent, page_width, page_height):
    """Convert percentage coordinates to PDF coordinates"""
    return (x_percent / 100) * page_width, (y_percent / 100) * page_height


# Core distance math (squared distances to avoid sqrt until needed)
def dot(ax, ay, bx, by):
    return ax*bx + ay*by

def clamp01(t: float) -> float:
    return 0.0 if t < 0.0 else (1.0 if t > 1.0 else t)

def closest_t_on_seg(px, py, ax, ay, bx, by) -> float:
    """Return t in [0,1] where AB is closest to point P."""
    vx, vy = bx - ax, by - ay
    denom = vx*vx + vy*vy
    if denom == 0.0:
        return 0.0
    t = dot(px - ax, py - ay, vx, vy) / denom
    return clamp01(t)

def dist2_point_to_seg(px, py, ax, ay, bx, by) -> float:
    t = closest_t_on_seg(px, py, ax, ay, bx, by)
    qx, qy = ax + t*(bx - ax), ay + t*(by - ay)
    dx, dy = px - qx, py - qy
    return dx*dx + dy*dy

def dist2_seg_to_seg(ax, ay, bx, by, cx, cy, dx, dy) -> float:
    """Min distance^2 between segments AB and CD. Robust & fast."""
    # Based on closest points between two segments (Ericson)
    # Convert to vectors
    ux, uy = bx - ax, by - ay
    vx, vy = dx - cx, dy - cy
    wx, wy = ax - cx, ay - cy

    a = dot(ux, uy, ux, uy)      # always >= 0
    b = dot(ux, uy, vx, vy)
    c = dot(vx, vy, vx, vy)      # always >= 0
    d = dot(ux, uy, wx, wy)
    e = dot(vx, vy, wx, wy)
    D = a*c - b*b                 # always >= 0

    sc, sN, sD = D, D, D
    tc, tN, tD = D, D, D

    if D < 1e-12:
        # Lines almost parallel: choose s = 0 and clamp t
        sN = 0.0
        sD = 1.0
        tN = e
        tD = c
    else:
        sN = (b*e - c*d)
        tN = (a*e - b*d)
        if sN < 0.0:
            sN = 0.0
            tN = e
            tD = c
        elif sN > sD:
            sN = sD
            tN = e + b
            tD = c

    if tN < 0.0:
        tN = 0.0
        # Recompute s for this edge
        if -d < 0.0:
            sN = 0.0
        elif -d > a:
            sN = sD
        else:
            sN = -d
            sD = a
    elif tN > tD:
        tN = tD
        if (-d + b) < 0.0:
            sN = 0.0
        elif (-d + b) > a:
            sN = sD
        else:
            sN = (-d + b)
            sD = a

    sc = 0.0 if abs(sN) < 1e-12 else (sN / sD)
    tc = 0.0 if abs(tN) < 1e-12 else (tN / tD)

    # Closest points
    dx = wx[0] if isinstance(wx, tuple) else wx
    # Build points
    cxA = ax + sc*ux
    cyA = ay + sc*uy
    cxB = cx + tc*vx
    cyB = cy + tc*vy
    dx, dy = cxA - cxB, cyA - cyB
    return dx*dx + dy*dy

def aabb_inflate(aabb, r):
    (minx, miny, maxx, maxy) = aabb
    return (minx - r, miny - r, maxx + r, maxy + r)

def seg_aabb(ax, ay, bx, by):
    return (min(ax, bx), min(ay, by), max(ax, bx), max(ay, by))

def aabb_overlap(a, b):
    return not (a[2] < b[0] or b[2] < a[0] or a[3] < b[1] or b[3] < a[1])

# Union-of-capsules eraser representation + grid index
class Capsule:
    __slots__ = ("ax","ay","bx","by","r","aabb")
    def __init__(self, ax, ay, bx, by, r):
        self.ax, self.ay, self.bx, self.by, self.r = ax, ay, bx, by, r
        self.aabb = aabb_inflate(seg_aabb(ax, ay, bx, by), r)

def build_capsules(eraser_points_px: List[float], r: float) -> List[Capsule]:
    caps = []
    pts = eraser_points_px
    for i in range(0, len(pts) - 3, 2):
        ax, ay = pts[i], pts[i+1]
        bx, by = pts[i+2], pts[i+3]
        caps.append(Capsule(ax, ay, bx, by, r))
    return caps

class UniformGrid:
    """Very small, fast spatial index for capsule AABBs."""
    def __init__(self, minx, miny, maxx, maxy, cell):
        self.minx, self.miny = minx, miny
        self.cell = cell
        nx = max(1, int((maxx - minx) / cell))
        ny = max(1, int((maxy - miny) / cell))
        self.nx, self.ny = nx, ny
        self.buckets = [[] for _ in range(nx * ny)]

    def _ixiy(self, x, y):
        ix = int((x - self.minx) / self.cell)
        iy = int((y - self.miny) / self.cell)
        ix = 0 if ix < 0 else (self.nx - 1 if ix >= self.nx else ix)
        iy = 0 if iy < 0 else (self.ny - 1 if iy >= self.ny else iy)
        return ix, iy

    def insert_capsule(self, idx: int, aabb):
        x0,y0,x1,y1 = aabb
        ix0,iy0 = self._ixiy(x0,y0)
        ix1,iy1 = self._ixiy(x1,y1)
        for ix in range(ix0, ix1+1):
            for iy in range(iy0, iy1+1):
                self.buckets[iy*self.nx + ix].append(idx)

    def candidates_for_aabb(self, aabb):
        x0,y0,x1,y1 = aabb
        ix0,iy0 = self._ixiy(x0,y0)
        ix1,iy1 = self._ixiy(x1,y1)
        seen = set()
        for ix in range(ix0, ix1+1):
            for iy in range(iy0, iy1+1):
                for idx in self.buckets[iy*self.nx + ix]:
                    if idx not in seen:
                        seen.add(idx)
                        yield idx

# distance-to-eraser = min over capsules of segment–capsule distance
def seg_capsule_dist2(ax, ay, bx, by, cap: Capsule) -> float:
    # distance between segment AB and capsule centerline segment UV, then subtract radius
    d2 = dist2_seg_to_seg(ax, ay, bx, by, cap.ax, cap.ay, cap.bx, cap.by)
    # d2 is distance^2 between centerlines; the capsule radius shrinks allowed distance
    # If d2 <= r^2, we are intersecting
    return d2 - cap.r*cap.r

def seg_hits_any_capsule(ax, ay, bx, by, capsules: List[Capsule], grid: UniformGrid) -> bool:
    aabb = seg_aabb(ax, ay, bx, by)
    aabb = aabb_inflate(aabb, max(c.r for c in capsules) if capsules else 0.0)
    for idx in grid.candidates_for_aabb(aabb):
        cap = capsules[idx]
        if aabb_overlap(aabb, cap.aabb):
            if seg_capsule_dist2(ax, ay, bx, by, cap) <= 0.0:
                return True
    return False

def seg_distance2_to_eraser(ax, ay, bx, by, capsules: List[Capsule], grid: UniformGrid) -> float:
    """Return min(distance^2 - r^2) across capsules; <=0 means 'inside'."""
    best = float("inf")
    aabb = aabb_inflate(seg_aabb(ax, ay, bx, by), max(c.r for c in capsules) if capsules else 0.0)
    for idx in grid.candidates_for_aabb(aabb):
        cap = capsules[idx]
        if aabb_overlap(aabb, cap.aabb):
            best = min(best, seg_capsule_dist2(ax, ay, bx, by, cap))
            if best <= 0.0:
                return best
    return best

# split a single segment where it crosses the eraser using bisection
def split_segment_against_eraser(p0, p1, capsules: List[Capsule], grid: UniformGrid, max_iter=18):
    """Return a list of kept subsegments [ (q0,q1), ... ] for segment p0->p1."""
    x0,y0 = p0
    x1,y1 = p1
    # Quick accept: if entirely outside (positive margin), keep whole
    if seg_distance2_to_eraser(x0,y0,x1,y1, capsules, grid) > 0.0:
        return [(p0, p1)]
    # Quick reject: if entirely inside (negative) and the shrinked midpoint test also negative, drop all
    mx,my = (x0+x1)*0.5, (y0+y1)*0.5
    if seg_distance2_to_eraser(mx,my,mx,my, capsules, grid) <= 0.0:
        # midpoint inside; likely fully erased
        # We still try to find boundary from each end to avoid corner cases
        pass

    def inside_point(pt):
        x,y = pt
        # Segment of zero length: test as a degenerate segment
        return seg_distance2_to_eraser(x,y,x,y, capsules, grid) <= 0.0

    a_inside = inside_point((x0,y0))
    b_inside = inside_point((x1,y1))

    if a_inside and b_inside:
        return []  # fully erased

    # If exactly one endpoint is inside, find the boundary point
    def bisect_boundary(a, b):
        ax,ay = a
        bx,by = b
        A_in = inside_point(a)
        B_in = inside_point(b)
        # Ensure A_outside, B_inside for consistency
        if A_in and not B_in:
            a,b = b,a
            ax,ay = a
            bx,by = b
            A_in = False
            B_in = True
        lo = 0.0
        hi = 1.0
        for _ in range(max_iter):
            t = (lo + hi) * 0.5
            mx = ax + t*(bx-ax)
            my = ay + t*(by-ay)
            if inside_point((mx,my)):
                hi = t
            else:
                lo = t
        t = hi
        return (ax + t*(bx-ax), ay + t*(by-ay))

    kept = []
    if a_inside != b_inside:
        # one in, one out -> clip to boundary
        boundary = bisect_boundary((x0,y0), (x1,y1))
        if a_inside:
            # keep boundary -> p1
            kept.append((boundary, (x1,y1)))
        else:
            # keep p0 -> boundary
            kept.append(((x0,y0), boundary))
        return kept

    # Both outside, but may cross (enter+exit). If not crossing (tangent), we keep as is.
    if not seg_hits_any_capsule(x0,y0,x1,y1,capsules,grid):
        return [(p0,p1)]

    # Crossing: find enter and exit points
    enter = bisect_boundary((x0,y0), (x1,y1))
    exit  = bisect_boundary((x1,y1), (x0,y0))
    kept.append(((x0,y0), enter))
    kept.append((exit, (x1,y1)))
    return kept


# >>> robust line erasing using capsules + grid (page-space)
def filter_line_by_eraser_px(line_points_px: List[float], eraser_capsules: List[Capsule], grid: UniformGrid):
    """Return list of segments (each as flat [x0,y0,x1,y1,...]) after erasing."""
    if not eraser_capsules:
        return [line_points_px]

    # Walk each consecutive pair and split against eraser
    pts = [(line_points_px[i], line_points_px[i+1]) for i in range(0, len(line_points_px), 2)]
    out_segments: List[List[float]] = []
    current: List[float] = []

    def flush_current():
        nonlocal current
        if len(current) >= 4:
            out_segments.append(current)
        current = []

    for i in range(len(pts)-1):
        p0, p1 = pts[i], pts[i+1]
        pieces = split_segment_against_eraser(p0, p1, eraser_capsules, grid)
        if not pieces:
            # segment fully erased — end current polyline if it exists
            flush_current()
            continue
        for (q0, q1) in pieces:
            if not current:
                current.extend([q0[0], q0[1], q1[0], q1[1]])
            else:
                # If the first point matches the tail, just append the endpoint
                lastx, lasty = current[-2], current[-1]
                if abs(lastx - q0[0]) < 1e-6 and abs(lasty - q0[1]) < 1e-6:
                    current.extend([q1[0], q1[1]])
                else:
                    # Discontinuous — start a new segment
                    flush_current()
                    current.extend([q0[0], q0[1], q1[0], q1[1]])

    flush_current()
    return out_segments


# =========================
# PDF writing
# =========================

def burn_annotations_to_pdf(pdf_path: str, output_path: str, annotations: list[dict]):
    doc = fitz.open(pdf_path)
    total_pages = doc.page_count
    debug_print(f"PDF has {total_pages} pages")

    for annotation in annotations:
        page_number = annotation.get("page", 1)
        debug_print(f"Processing annotation for page {page_number}")
        if page_number < 1 or page_number > total_pages:
            debug_print(f"Warning: Page number {page_number} is out of range (1-{total_pages}), skipping annotation")
            continue

        page = doc[page_number - 1]
        page_height = page.rect.height
        page_width = page.rect.width
        data = annotation.get("data", {})

        debug_print(f"Processing annotation for page {page_number} with percentage coordinates")
        debug_print(f"Page dimensions: {page_width}x{page_height}")

        # Separate erasers from other annotations
        lines = data.get("lines", [])
        erasers = [line for line in lines if line.get("tool") == "eraser"]
        non_eraser_lines = [line for line in lines if line.get("tool") != "eraser"]

        # compute eraser width once (percent -> px), build capsules + grid
        if erasers:
            avg_eraser_stroke = sum(e.get("strokeWidth", 10) for e in erasers) / len(erasers)
            eraser_width_percent = max(
                ERASER_MIN_WIDTH_PERCENT,
                min(ERASER_MAX_WIDTH_PERCENT,
                    (avg_eraser_stroke / ASSUMED_PAGE_WIDTH_PX) * 100 * ERASER_SCALE_FACTOR)
            )
        else:
            eraser_width_percent = ERASER_DEFAULT_WIDTH_PERCENT

        r_px = (eraser_width_percent / 100.0) * page_width * 0.5  # radius in page px
        debug_print(f"  Using eraser detection width: {eraser_width_percent:.2f}% (r={r_px:.2f}px)")

        # Convert all eraser polylines to page px once and build capsules
        all_capsules: List[Capsule] = []
        for er in erasers:
            pts = er["points"]
            pts_px: List[float] = []
            for i in range(0, len(pts), 2):
                x, y = percentage_to_pdf_coords(pts[i], pts[i+1], page_width, page_height)
                pts_px.extend([x, y])
            all_capsules.extend(build_capsules(pts_px, r_px))

        # Build a small uniform grid index over the page for capsule AABBs
        cell = max(8.0, r_px)  # heuristic
        grid = UniformGrid(0.0, 0.0, page_width, page_height, cell)
        for idx, cap in enumerate(all_capsules):
            grid.insert_capsule(idx, cap.aabb)

        # Filter and draw lines
        for line in non_eraser_lines:
            # Convert line points to page px once
            pts = line["points"]
            line_px: List[float] = []
            for i in range(0, len(pts), 2):
                x, y = percentage_to_pdf_coords(pts[i], pts[i+1], page_width, page_height)
                line_px.extend([x, y])

            line_segments_px = filter_line_by_eraser_px(line_px, all_capsules, grid)

            stroke = hex_to_rgb(line["stroke"])
            stroke_width = line["strokeWidth"]

            for segment_points in line_segments_px:
                if len(segment_points) < 4:
                    continue
                # Draw polyline
                for i in range(0, len(segment_points) - 2, 2):
                    x1, y1 = segment_points[i], segment_points[i + 1]
                    x2, y2 = segment_points[i + 2], segment_points[i + 3]
                    p1 = fitz.Point(x1, y1)
                    p2 = fitz.Point(x2, y2)
                    page.draw_line(p1, p2, color=stroke, width=stroke_width)
                # small round joints for nicer look
                for i in range(0, len(segment_points), 2):
                    p = fitz.Point(segment_points[i], segment_points[i+1])
                    page.draw_circle(p, stroke_width * 0.25, color=stroke)

        # Draw texts (unchanged)
        texts = data.get("texts", [])
        for text in texts:
            x, y = percentage_to_pdf_coords(text["x"], text["y"], page_width, page_height)
            rect = fitz.Rect(x, y, x + 200, y + 50)
            color = hex_to_rgb("red")
            font_size = text["fontSize"]
            content = text["text"]
            debug_print(f"  Adding text '{content[:20]}...' at ({x:.1f}, {y:.1f}), font size: {font_size}")
            page.insert_textbox(rect, content, fontsize=font_size, color=color, align=0)

        # Draw sticky notes (unchanged)
        stickyNotes = data.get("stickyNotes", [])
        for sticky in stickyNotes:
            x, y = percentage_to_pdf_coords(sticky["x"], sticky["y"], page_width, page_height)
            content = sticky["text"]
            debug_print(f"  Adding sticky note '{content[:20]}...' at ({x:.1f}, {y:.1f})")
            annot = page.add_text_annot(fitz.Point(x, y), content)
            annot.set_open(True)
            annot.set_info(title="Sticky Note")

    doc.save(output_path)


@router.post("/annotated-pdfs")
async def export_annotated_pdfs(request: ExportRequest):
    course_id = request.course_id
    assessment_id = request.assessment_id

    answer_folder = (
        settings.ANSWER_SHEET_STORAGE_FOLDER / str(course_id) / str(assessment_id)
    )
    annotation_folder = (
        settings.ANNOTATION_STORAGE_FOLDER / str(course_id) / str(assessment_id)
    )

    if not answer_folder.exists():
        raise HTTPException(status_code=404, detail="Answer sheet folder not found")

    temp_dir = Path(tempfile.mkdtemp())
    zip_path = temp_dir / "annotated_pdfs.zip"

    with zipfile.ZipFile(zip_path, "w") as zipf:
        for pdf_file in answer_folder.glob("*.pdf"):
            student_id = pdf_file.stem
            annotation_dir = annotation_folder / student_id
            if not annotation_dir.exists():
                continue

            annotations = []
            for annotation_file in annotation_dir.glob("*.json"):
                try:
                    with open(annotation_file, "r") as f:
                        data = json.load(f)
                        page_number = data.get("page")
                        if page_number is None:
                            filename = annotation_file.stem
                            if "page_" in filename:
                                try:
                                    page_number = int(filename.split("page_")[-1])
                                except (ValueError, IndexError):
                                    page_number = 1
                            else:
                                page_number = 1
                                debug_print(f"Warning: Could not determine page number for {annotation_file}, defaulting to page 1")
                        annotations.append({"page": page_number, "data": data})
                except Exception as e:
                    debug_print(f"Skipping {annotation_file}: {e}")
                    continue

            if not annotations:
                continue

            output_pdf = temp_dir / f"{student_id}_annotated.pdf"
            burn_annotations_to_pdf(str(pdf_file), str(output_pdf), annotations)
            zipf.write(output_pdf, arcname=f"{student_id}.pdf")

    return FileResponse(
        zip_path, filename="annotated_pdfs.zip", media_type="application/zip"
    )
