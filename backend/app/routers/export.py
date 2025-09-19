from pathlib import Path
import zipfile
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.core.config import settings
import fitz
import json
import tempfile

from app.schemas.uploaded_file import ExportRequest

router = APIRouter(prefix="/export", tags=["Export"])

# Eraser detection configuration - adjust these values to fine-tune eraser precision
ERASER_MIN_WIDTH_PERCENT = 0.8     # Minimum eraser detection width (percentage)
ERASER_MAX_WIDTH_PERCENT = 4.0     # Maximum eraser detection width (percentage)
ERASER_DEFAULT_WIDTH_PERCENT = 1.5 # Default width when no eraser data available
ERASER_SCALE_FACTOR = 0.7          # Scale factor for converting pixel width to percentage
ASSUMED_PAGE_WIDTH_PX = 600        # Assumed page width in pixels for conversion

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


def point_in_eraser_area(point_x, point_y, eraser_points, eraser_width):
    """Check if a point is within the eraser area"""
    import math
    
    # Check distance to each line segment in the eraser stroke
    for i in range(0, len(eraser_points) - 2, 2):
        if i + 3 < len(eraser_points):
            x1, y1 = eraser_points[i], eraser_points[i + 1]
            x2, y2 = eraser_points[i + 2], eraser_points[i + 3]
            
            # Calculate distance from point to line segment
            A = point_x - x1
            B = point_y - y1
            C = x2 - x1
            D = y2 - y1
            
            dot = A * C + B * D
            len_sq = C * C + D * D
            
            if len_sq == 0:
                # Line is a point
                distance = math.sqrt(A * A + B * B)
            else:
                t = max(0, min(1, dot / len_sq))
                projection_x = x1 + t * C
                projection_y = y1 + t * D
                distance = math.sqrt((point_x - projection_x)**2 + (point_y - projection_y)**2)
            
            if distance <= eraser_width / 2:
                return True
    
    return False


def filter_line_by_eraser(line_points, eraser_points_list, eraser_width):
    """Filter out portions of a line that overlap with eraser strokes, returning segments"""
    if not eraser_points_list:
        return [line_points]  # Return as single segment
    
    # Group points into continuous segments
    segments = []
    current_segment = []
    
    for i in range(0, len(line_points) - 1, 2):
        if i + 1 < len(line_points):
            point_x = line_points[i]
            point_y = line_points[i + 1]
            
            # Check if this point is erased by any eraser
            point_erased = False
            for eraser_points in eraser_points_list:
                if point_in_eraser_area(point_x, point_y, eraser_points, eraser_width):
                    point_erased = True
                    break
            
            if not point_erased:
                # Add point to current segment
                current_segment.extend([point_x, point_y])
            else:
                # Point is erased - finish current segment if it has content
                if len(current_segment) >= 2:  # At least 1 point (2 coordinates) - reduced requirement
                    segments.append(current_segment)
                current_segment = []
    
    # Don't forget the last segment
    if len(current_segment) >= 2:  # At least 1 point
        segments.append(current_segment)
    
    return segments


def burn_annotations_to_pdf(pdf_path: str, output_path: str, annotations: list[dict]):
    doc = fitz.open(pdf_path)
    total_pages = doc.page_count
    print(f"PDF has {total_pages} pages")

    for annotation in annotations:
        page_number = annotation.get("page", 1)
        print(f"Processing annotation for page {page_number}")
        
        # Validate page number
        if page_number < 1 or page_number > total_pages:
            print(f"Warning: Page number {page_number} is out of range (1-{total_pages}), skipping annotation")
            continue
            
        page = doc[page_number - 1]  # Convert to 0-based index
        page_height = page.rect.height
        page_width = page.rect.width
        data = annotation.get("data", {})

        print(f"Processing annotation for page {page_number} with percentage coordinates")
        print(f"Page dimensions: {page_width}x{page_height}")

        # Separate erasers from other annotations
        lines = data.get("lines", [])
        erasers = [line for line in lines if line.get("tool") == "eraser"]
        non_eraser_lines = [line for line in lines if line.get("tool") != "eraser"]
        
        # Filter lines by erasers and draw remaining segments
        for line in non_eraser_lines:
            # Calculate eraser detection width using global configuration
            if erasers:
                # Get average eraser width and convert from pixel-based to percentage-based
                avg_eraser_stroke = sum(e.get("strokeWidth", 10) for e in erasers) / len(erasers)
                # Convert to percentage using configurable parameters
                eraser_width_percent = max(
                    ERASER_MIN_WIDTH_PERCENT, 
                    min(ERASER_MAX_WIDTH_PERCENT, 
                        (avg_eraser_stroke / ASSUMED_PAGE_WIDTH_PX) * 100 * ERASER_SCALE_FACTOR)
                )
            else:
                eraser_width_percent = ERASER_DEFAULT_WIDTH_PERCENT
            
            print(f"  Using eraser detection width: {eraser_width_percent:.2f}%")
            
            line_segments = filter_line_by_eraser(line["points"], 
                                                 [eraser["points"] for eraser in erasers], 
                                                 eraser_width_percent)
            
            # Draw each segment as a separate line
            for segment_points in line_segments:
                if len(segment_points) >= 2:  # At least 1 point (2 coordinates)
                    stroke = hex_to_rgb(line["stroke"])
                    stroke_width = line["strokeWidth"]
                    print(f"  Drawing line segment with {len(segment_points)//2} points, stroke width: {stroke_width}")
                    
                    if len(segment_points) == 2:
                        # Single point - draw as a dot
                        x, y = percentage_to_pdf_coords(segment_points[0], segment_points[1], page_width, page_height)
                        p = fitz.Point(x, y)
                        page.draw_circle(p, stroke_width / 2, color=stroke, fill=stroke)
                    else:
                        # Multiple points - draw as connected lines
                        for i in range(0, len(segment_points) - 2, 2):
                            # Convert percentage to PDF coordinates
                            x1, y1 = percentage_to_pdf_coords(segment_points[i], segment_points[i + 1], page_width, page_height)
                            x2, y2 = percentage_to_pdf_coords(segment_points[i + 2], segment_points[i + 3], page_width, page_height)
                            
                            p1 = fitz.Point(x1, y1)
                            p2 = fitz.Point(x2, y2)
                            page.draw_line(p1, p2, color=stroke, width=stroke_width)
                            page.draw_circle(p1, stroke_width / 4, color=stroke)

        # Draw texts (no eraser filtering needed)
        texts = data.get("texts", [])
        for text in texts:
            # Convert percentage to PDF coordinates
            x, y = percentage_to_pdf_coords(text["x"], text["y"], page_width, page_height)
            # Create text box with reasonable dimensions
            rect = fitz.Rect(x, y, x + 200, y + 50)
            
            color = hex_to_rgb("red")
            font_size = text["fontSize"]
            content = text["text"]
            print(f"  Adding text '{content[:20]}...' at ({x:.1f}, {y:.1f}), font size: {font_size}")
            page.insert_textbox(rect, content, fontsize=font_size, color=color, align=0)

        # Draw sticky notes (no eraser filtering needed)
        stickyNotes = data.get("stickyNotes", [])
        for sticky in stickyNotes:
            # Convert percentage to PDF coordinates
            x, y = percentage_to_pdf_coords(sticky["x"], sticky["y"], page_width, page_height)
            
            content = sticky["text"]
            print(f"  Adding sticky note '{content[:20]}...' at ({x:.1f}, {y:.1f})")
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
                        
                        # Try to get page number from the data, or try to infer it from filename
                        page_number = data.get("page")
                        if page_number is None:
                            # Try to extract page number from filename (e.g., "question_1_page_2.json")
                            filename = annotation_file.stem
                            if "page_" in filename:
                                try:
                                    page_number = int(filename.split("page_")[-1])
                                except (ValueError, IndexError):
                                    page_number = 1
                            else:
                                # Default to page 1 if we can't determine the page
                                page_number = 1
                                print(f"Warning: Could not determine page number for {annotation_file}, defaulting to page 1")
                        
                        annotations.append({"page": page_number, "data": data})
                except Exception as e:
                    print(f"Skipping {annotation_file}: {e}")
                    continue

            if not annotations:
                continue

            output_pdf = temp_dir / f"{student_id}_annotated.pdf"
            burn_annotations_to_pdf(str(pdf_file), str(output_pdf), annotations)
            zipf.write(output_pdf, arcname=f"{student_id}.pdf")

    return FileResponse(
        zip_path, filename="annotated_pdfs.zip", media_type="application/zip"
    )
