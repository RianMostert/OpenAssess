"""
PDF Annotation Service

Handles burning annotations (lines, text, sticky notes) onto PDF files.
Includes sophisticated eraser detection using union-of-capsules geometry
with spatial indexing for performance.
"""

import fitz  # PyMuPDF
from typing import List, Tuple, Dict, Any
from pathlib import Path


class PdfAnnotationService:
    """
    Service for applying annotations to PDF files with eraser support.
    
    Features:
    - Draw lines with stroke width and color
    - Add text annotations
    - Add sticky note annotations
    - Advanced eraser detection using capsule geometry
    - Spatial indexing for efficient collision detection
    """
    
    # Eraser detection configuration
    ERASER_MIN_WIDTH_PERCENT = 0.8
    ERASER_MAX_WIDTH_PERCENT = 4.0
    ERASER_DEFAULT_WIDTH_PERCENT = 1.5
    ERASER_SCALE_FACTOR = 0.7
    ASSUMED_PAGE_WIDTH_PX = 600
    
    def __init__(self, debug: bool = False):
        self.debug = debug
    
    def _debug_print(self, *args):
        """Print debug messages if debug mode is enabled"""
        if self.debug:
            print(*args)
    
    # =========================
    # Color conversion
    # =========================
    
    @staticmethod
    def hex_to_rgb(color: str) -> Tuple[float, float, float]:
        """Convert hex color or named color to RGB tuple (0-1 range)"""
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
    
    # =========================
    # Coordinate conversion
    # =========================
    
    @staticmethod
    def percentage_to_pdf_coords(
        x_percent: float, 
        y_percent: float, 
        page_width: float, 
        page_height: float
    ) -> Tuple[float, float]:
        """Convert percentage coordinates to PDF coordinates"""
        return (x_percent / 100) * page_width, (y_percent / 100) * page_height
    
    # =========================
    # Geometry utilities
    # =========================
    
    @staticmethod
    def dot(ax: float, ay: float, bx: float, by: float) -> float:
        """Dot product of two 2D vectors"""
        return ax * bx + ay * by
    
    @staticmethod
    def clamp01(t: float) -> float:
        """Clamp value to [0, 1] range"""
        return 0.0 if t < 0.0 else (1.0 if t > 1.0 else t)
    
    def closest_t_on_seg(
        self, 
        px: float, py: float, 
        ax: float, ay: float, 
        bx: float, by: float
    ) -> float:
        """Return t in [0,1] where segment AB is closest to point P"""
        vx, vy = bx - ax, by - ay
        denom = vx * vx + vy * vy
        if denom == 0.0:
            return 0.0
        t = self.dot(px - ax, py - ay, vx, vy) / denom
        return self.clamp01(t)
    
    def dist2_point_to_seg(
        self,
        px: float, py: float,
        ax: float, ay: float,
        bx: float, by: float
    ) -> float:
        """Squared distance from point P to segment AB"""
        t = self.closest_t_on_seg(px, py, ax, ay, bx, by)
        qx, qy = ax + t * (bx - ax), ay + t * (by - ay)
        dx, dy = px - qx, py - qy
        return dx * dx + dy * dy
    
    def dist2_seg_to_seg(
        self,
        ax: float, ay: float, bx: float, by: float,
        cx: float, cy: float, dx: float, dy: float
    ) -> float:
        """
        Min squared distance between segments AB and CD.
        Robust implementation based on Ericson's closest points algorithm.
        """
        ux, uy = bx - ax, by - ay
        vx, vy = dx - cx, dy - cy
        wx, wy = ax - cx, ay - cy
        
        a = self.dot(ux, uy, ux, uy)  # always >= 0
        b = self.dot(ux, uy, vx, vy)
        c = self.dot(vx, vy, vx, vy)  # always >= 0
        d = self.dot(ux, uy, wx, wy)
        e = self.dot(vx, vy, wx, wy)
        D = a * c - b * b  # always >= 0
        
        sc, sN, sD = D, D, D
        tc, tN, tD = D, D, D
        
        if D < 1e-12:
            # Lines almost parallel
            sN = 0.0
            sD = 1.0
            tN = e
            tD = c
        else:
            sN = (b * e - c * d)
            tN = (a * e - b * d)
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
        cxA = ax + sc * ux
        cyA = ay + sc * uy
        cxB = cx + tc * vx
        cyB = cy + tc * vy
        dx, dy = cxA - cxB, cyA - cyB
        return dx * dx + dy * dy
    
    @staticmethod
    def aabb_inflate(aabb: Tuple[float, float, float, float], r: float) -> Tuple[float, float, float, float]:
        """Inflate axis-aligned bounding box by radius r"""
        minx, miny, maxx, maxy = aabb
        return (minx - r, miny - r, maxx + r, maxy + r)
    
    @staticmethod
    def seg_aabb(ax: float, ay: float, bx: float, by: float) -> Tuple[float, float, float, float]:
        """Compute axis-aligned bounding box for segment"""
        return (min(ax, bx), min(ay, by), max(ax, bx), max(ay, by))
    
    @staticmethod
    def aabb_overlap(a: Tuple[float, float, float, float], b: Tuple[float, float, float, float]) -> bool:
        """Check if two AABBs overlap"""
        return not (a[2] < b[0] or b[2] < a[0] or a[3] < b[1] or b[3] < a[1])
    
    # =========================
    # Capsule geometry
    # =========================
    
    class Capsule:
        """Represents a capsule (line segment with radius) for eraser detection"""
        __slots__ = ("ax", "ay", "bx", "by", "r", "aabb")
        
        def __init__(self, ax: float, ay: float, bx: float, by: float, r: float):
            self.ax, self.ay, self.bx, self.by, self.r = ax, ay, bx, by, r
            self.aabb = PdfAnnotationService.aabb_inflate(
                PdfAnnotationService.seg_aabb(ax, ay, bx, by), r
            )
    
    def build_capsules(self, eraser_points_px: List[float], r: float) -> List[Capsule]:
        """Build list of capsules from eraser polyline points"""
        caps = []
        pts = eraser_points_px
        for i in range(0, len(pts) - 3, 2):
            ax, ay = pts[i], pts[i + 1]
            bx, by = pts[i + 2], pts[i + 3]
            caps.append(self.Capsule(ax, ay, bx, by, r))
        return caps
    
    # =========================
    # Spatial indexing
    # =========================
    
    class UniformGrid:
        """Spatial index using uniform grid for fast capsule AABB queries"""
        
        def __init__(self, minx: float, miny: float, maxx: float, maxy: float, cell: float):
            self.minx, self.miny = minx, miny
            self.cell = cell
            nx = max(1, int((maxx - minx) / cell))
            ny = max(1, int((maxy - miny) / cell))
            self.nx, self.ny = nx, ny
            self.buckets = [[] for _ in range(nx * ny)]
        
        def _ixiy(self, x: float, y: float) -> Tuple[int, int]:
            """Convert coordinates to grid indices"""
            ix = int((x - self.minx) / self.cell)
            iy = int((y - self.miny) / self.cell)
            ix = 0 if ix < 0 else (self.nx - 1 if ix >= self.nx else ix)
            iy = 0 if iy < 0 else (self.ny - 1 if iy >= self.ny else iy)
            return ix, iy
        
        def insert_capsule(self, idx: int, aabb: Tuple[float, float, float, float]):
            """Insert capsule index into grid cells overlapping its AABB"""
            x0, y0, x1, y1 = aabb
            ix0, iy0 = self._ixiy(x0, y0)
            ix1, iy1 = self._ixiy(x1, y1)
            for ix in range(ix0, ix1 + 1):
                for iy in range(iy0, iy1 + 1):
                    self.buckets[iy * self.nx + ix].append(idx)
        
        def candidates_for_aabb(self, aabb: Tuple[float, float, float, float]):
            """Yield candidate capsule indices for given AABB"""
            x0, y0, x1, y1 = aabb
            ix0, iy0 = self._ixiy(x0, y0)
            ix1, iy1 = self._ixiy(x1, y1)
            seen = set()
            for ix in range(ix0, ix1 + 1):
                for iy in range(iy0, iy1 + 1):
                    for idx in self.buckets[iy * self.nx + ix]:
                        if idx not in seen:
                            seen.add(idx)
                            yield idx
    
    # =========================
    # Eraser collision detection
    # =========================
    
    def seg_capsule_dist2(
        self,
        ax: float, ay: float, bx: float, by: float,
        cap: Capsule
    ) -> float:
        """
        Squared distance from segment AB to capsule centerline, minus radius squared.
        Returns <= 0 if segment intersects capsule.
        """
        d2 = self.dist2_seg_to_seg(ax, ay, bx, by, cap.ax, cap.ay, cap.bx, cap.by)
        return d2 - cap.r * cap.r
    
    def seg_hits_any_capsule(
        self,
        ax: float, ay: float, bx: float, by: float,
        capsules: List[Capsule],
        grid: UniformGrid
    ) -> bool:
        """Check if segment AB hits any eraser capsule"""
        aabb = self.seg_aabb(ax, ay, bx, by)
        aabb = self.aabb_inflate(aabb, max(c.r for c in capsules) if capsules else 0.0)
        for idx in grid.candidates_for_aabb(aabb):
            cap = capsules[idx]
            if self.aabb_overlap(aabb, cap.aabb):
                if self.seg_capsule_dist2(ax, ay, bx, by, cap) <= 0.0:
                    return True
        return False
    
    def seg_distance2_to_eraser(
        self,
        ax: float, ay: float, bx: float, by: float,
        capsules: List[Capsule],
        grid: UniformGrid
    ) -> float:
        """
        Return minimum (distance^2 - r^2) across all capsules.
        Value <= 0 means segment is inside eraser.
        """
        best = float("inf")
        aabb = self.aabb_inflate(self.seg_aabb(ax, ay, bx, by), 
                                  max(c.r for c in capsules) if capsules else 0.0)
        for idx in grid.candidates_for_aabb(aabb):
            cap = capsules[idx]
            if self.aabb_overlap(aabb, cap.aabb):
                best = min(best, self.seg_capsule_dist2(ax, ay, bx, by, cap))
                if best <= 0.0:
                    return best
        return best
    
    # =========================
    # Line splitting
    # =========================
    
    def split_segment_against_eraser(
        self,
        p0: Tuple[float, float],
        p1: Tuple[float, float],
        capsules: List[Capsule],
        grid: UniformGrid,
        max_iter: int = 18
    ) -> List[Tuple[Tuple[float, float], Tuple[float, float]]]:
        """
        Split a segment where it crosses eraser capsules using bisection.
        Returns list of kept subsegments [(q0, q1), ...].
        """
        x0, y0 = p0
        x1, y1 = p1
        
        # Quick accept: entirely outside
        if self.seg_distance2_to_eraser(x0, y0, x1, y1, capsules, grid) > 0.0:
            return [(p0, p1)]
        
        # Check midpoint for quick rejection
        mx, my = (x0 + x1) * 0.5, (y0 + y1) * 0.5
        
        def inside_point(pt: Tuple[float, float]) -> bool:
            x, y = pt
            return self.seg_distance2_to_eraser(x, y, x, y, capsules, grid) <= 0.0
        
        a_inside = inside_point((x0, y0))
        b_inside = inside_point((x1, y1))
        
        if a_inside and b_inside:
            return []  # Fully erased
        
        def bisect_boundary(
            a: Tuple[float, float], 
            b: Tuple[float, float]
        ) -> Tuple[float, float]:
            """Find boundary point between inside and outside using bisection"""
            ax, ay = a
            bx, by = b
            A_in = inside_point(a)
            B_in = inside_point(b)
            # Ensure A_outside, B_inside for consistency
            if A_in and not B_in:
                a, b = b, a
                ax, ay = a
                bx, by = b
            lo = 0.0
            hi = 1.0
            for _ in range(max_iter):
                t = (lo + hi) * 0.5
                mx = ax + t * (bx - ax)
                my = ay + t * (by - ay)
                if inside_point((mx, my)):
                    hi = t
                else:
                    lo = t
            t = hi
            return (ax + t * (bx - ax), ay + t * (by - ay))
        
        kept = []
        if a_inside != b_inside:
            # One in, one out -> clip to boundary
            boundary = bisect_boundary((x0, y0), (x1, y1))
            if a_inside:
                kept.append((boundary, (x1, y1)))
            else:
                kept.append(((x0, y0), boundary))
            return kept
        
        # Both outside, but may cross (enter+exit)
        if not self.seg_hits_any_capsule(x0, y0, x1, y1, capsules, grid):
            return [(p0, p1)]
        
        # Crossing: find enter and exit points
        enter = bisect_boundary((x0, y0), (x1, y1))
        exit_pt = bisect_boundary((x1, y1), (x0, y0))
        kept.append(((x0, y0), enter))
        kept.append((exit_pt, (x1, y1)))
        return kept
    
    def filter_line_by_eraser_px(
        self,
        line_points_px: List[float],
        eraser_capsules: List[Capsule],
        grid: UniformGrid
    ) -> List[List[float]]:
        """
        Filter line polyline against eraser capsules.
        Returns list of remaining line segments (each as flat [x0,y0,x1,y1,...]).
        """
        if not eraser_capsules:
            return [line_points_px]
        
        # Convert points to tuples
        pts = [(line_points_px[i], line_points_px[i + 1]) 
               for i in range(0, len(line_points_px), 2)]
        out_segments: List[List[float]] = []
        current: List[float] = []
        
        def flush_current():
            nonlocal current
            if len(current) >= 4:
                out_segments.append(current)
            current = []
        
        for i in range(len(pts) - 1):
            p0, p1 = pts[i], pts[i + 1]
            pieces = self.split_segment_against_eraser(p0, p1, eraser_capsules, grid)
            if not pieces:
                # Fully erased - end current polyline
                flush_current()
                continue
            for (q0, q1) in pieces:
                if not current:
                    current.extend([q0[0], q0[1], q1[0], q1[1]])
                else:
                    # Check if continuous
                    lastx, lasty = current[-2], current[-1]
                    if abs(lastx - q0[0]) < 1e-6 and abs(lasty - q0[1]) < 1e-6:
                        current.extend([q1[0], q1[1]])
                    else:
                        # Discontinuous - start new segment
                        flush_current()
                        current.extend([q0[0], q0[1], q1[0], q1[1]])
        
        flush_current()
        return out_segments
    
    # =========================
    # Main PDF annotation burning
    # =========================
    
    def burn_annotations_to_pdf(
        self,
        pdf_path: str,
        output_path: str,
        annotations: List[Dict[str, Any]]
    ):
        """
        Apply annotations to PDF file and save to output path.
        
        Args:
            pdf_path: Path to input PDF file
            output_path: Path to save annotated PDF
            annotations: List of annotation dicts with structure:
                {
                    "page": int,  # 1-indexed page number
                    "data": {
                        "lines": [{"points": [x,y,...], "stroke": color, "strokeWidth": float, "tool": str}],
                        "texts": [{"x": float, "y": float, "text": str, "fontSize": float}],
                        "stickyNotes": [{"x": float, "y": float, "text": str}]
                    }
                }
        """
        doc = fitz.open(pdf_path)
        total_pages = doc.page_count
        self._debug_print(f"PDF has {total_pages} pages")
        
        for annotation in annotations:
            page_number = annotation.get("page", 1)
            self._debug_print(f"Processing annotation for page {page_number}")
            
            if page_number < 1 or page_number > total_pages:
                self._debug_print(
                    f"Warning: Page number {page_number} is out of range (1-{total_pages}), skipping"
                )
                continue
            
            page = doc[page_number - 1]
            page_height = page.rect.height
            page_width = page.rect.width
            data = annotation.get("data", {})
            
            self._debug_print(f"Page dimensions: {page_width}x{page_height}")
            
            # Process lines in order, applying erasers only to previous lines
            lines = data.get("lines", [])
            
            # Calculate default eraser width
            erasers = [line for line in lines if line.get("tool") == "fine-eraser"]
            if erasers:
                avg_eraser_stroke = sum(e.get("strokeWidth", 10) for e in erasers) / len(erasers)
                eraser_width_percent = max(
                    self.ERASER_MIN_WIDTH_PERCENT,
                    min(self.ERASER_MAX_WIDTH_PERCENT,
                        (avg_eraser_stroke / self.ASSUMED_PAGE_WIDTH_PX) * 100 * self.ERASER_SCALE_FACTOR)
                )
            else:
                eraser_width_percent = self.ERASER_DEFAULT_WIDTH_PERCENT
            
            r_px = (eraser_width_percent / 100.0) * page_width * 0.5
            self._debug_print(f"  Eraser width: {eraser_width_percent:.2f}% (r={r_px:.2f}px)")
            
            # Store processed lines as polyline segments
            # Each entry: (stroke_color, stroke_width, segments_px)
            # where segments_px is a list of line segments that survived erasure
            processed_lines: List[Tuple[Tuple[float, float, float], float, List[List[float]]]] = []
            
            # Process each line/eraser in order
            for line_item in lines:
                tool = line_item.get("tool", "pencil")
                pts = line_item["points"]
                
                # Convert points to page coordinates
                pts_px: List[float] = []
                for i in range(0, len(pts), 2):
                    x, y = self.percentage_to_pdf_coords(pts[i], pts[i + 1], page_width, page_height)
                    pts_px.extend([x, y])
                
                if tool == "fine-eraser":
                    # Build capsules for this eraser stroke
                    eraser_capsules = self.build_capsules(pts_px, r_px)
                    
                    # Build spatial index for this eraser
                    cell = max(8.0, r_px)
                    grid = self.UniformGrid(0.0, 0.0, page_width, page_height, cell)
                    for idx, cap in enumerate(eraser_capsules):
                        grid.insert_capsule(idx, cap.aabb)
                    
                    # Apply eraser to all previously processed lines
                    updated_processed_lines: List[Tuple[Tuple[float, float, float], float, List[List[float]]]] = []
                    for stroke_color, stroke_width, existing_segments in processed_lines:
                        new_segments = []
                        for segment in existing_segments:
                            # Apply eraser to this segment
                            erased_segments = self.filter_line_by_eraser_px(segment, eraser_capsules, grid)
                            new_segments.extend(erased_segments)
                        
                        # Only keep the line if it still has segments after erasure
                        if new_segments:
                            updated_processed_lines.append((stroke_color, stroke_width, new_segments))
                    
                    processed_lines = updated_processed_lines
                    self._debug_print(f"  Applied eraser, {len(processed_lines)} lines remaining")
                    
                else:
                    # Regular line - add it to processed lines
                    stroke_color = self.hex_to_rgb(line_item["stroke"])
                    stroke_width = line_item["strokeWidth"]
                    processed_lines.append((stroke_color, stroke_width, [pts_px]))
            
            # Draw all surviving line segments
            for stroke_color, stroke_width, segments in processed_lines:
                for segment_points in segments:
                    if len(segment_points) < 4:
                        continue
                    # Draw polyline
                    for i in range(0, len(segment_points) - 2, 2):
                        x1, y1 = segment_points[i], segment_points[i + 1]
                        x2, y2 = segment_points[i + 2], segment_points[i + 3]
                        p1 = fitz.Point(x1, y1)
                        p2 = fitz.Point(x2, y2)
                        page.draw_line(p1, p2, color=stroke_color, width=stroke_width)
                    # Draw round joints for smooth appearance
                    for i in range(0, len(segment_points), 2):
                        p = fitz.Point(segment_points[i], segment_points[i + 1])
                        page.draw_circle(p, stroke_width * 0.25, color=stroke_color)
            
            # Draw text annotations
            texts = data.get("texts", [])
            for text in texts:
                x, y = self.percentage_to_pdf_coords(text["x"], text["y"], page_width, page_height)
                rect = fitz.Rect(x, y, x + 200, y + 50)
                color = self.hex_to_rgb("red")
                font_size = text["fontSize"]
                content = text["text"]
                self._debug_print(f"  Adding text '{content[:20]}...' at ({x:.1f}, {y:.1f})")
                page.insert_textbox(rect, content, fontsize=font_size, color=color, align=0)
            
            # Draw sticky notes
            sticky_notes = data.get("stickyNotes", [])
            for sticky in sticky_notes:
                x, y = self.percentage_to_pdf_coords(sticky["x"], sticky["y"], page_width, page_height)
                content = sticky["text"]
                self._debug_print(f"  Adding sticky note '{content[:20]}...' at ({x:.1f}, {y:.1f})")
                annot = page.add_text_annot(fitz.Point(x, y), content)
                annot.set_open(True)
                annot.set_info(title="Sticky Note")
        
        doc.save(output_path)
        self._debug_print(f"Saved annotated PDF to {output_path}")


# Create singleton instance for convenience
pdf_annotation_service = PdfAnnotationService()
