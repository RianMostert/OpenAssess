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


def flip_y(y, page_height):
    return page_height - y


def adjust_x(x, page_width):
    return x


def burn_annotations_to_pdf(pdf_path: str, output_path: str, annotations: list[dict]):
    doc = fitz.open(pdf_path)

    for annotation in annotations:
        page_number = annotation.get("page", 1)
        page = doc[page_number - 1]
        page_height = page.rect.height
        page_width = page.rect.width
        data = annotation.get("data", {})

        for line in data.get("lines", []):
            points = line["points"]
            stroke = hex_to_rgb(line["stroke"])
            stroke_width = line["strokeWidth"]
            for i in range(0, len(points) - 2, 2):
                p1 = fitz.Point(
                    adjust_x(points[i], page_width), flip_y(points[i + 1], page_height)
                )
                p2 = fitz.Point(
                    adjust_x(points[i + 2], page_width),
                    flip_y(points[i + 3], page_height),
                )
                page.draw_line(p1, p2, color=stroke, width=stroke_width)
                page.draw_circle(p1, stroke_width / 4, color=stroke)

        for text in data.get("texts", []):
            x = text["x"]
            y = text["y"]
            rect = fitz.Rect(x, y, x + 200, y + 1000)
            color = hex_to_rgb(text["fill"])
            font_size = text["fontSize"]
            content = text["text"]
            page.insert_textbox(rect, content, fontsize=font_size, color=color, align=0)

        for sticky in data.get("stickyNotes", []):
            x = adjust_x(sticky["x"], page_width)
            y = flip_y(sticky["y"], page_height)
            content = sticky["text"]
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
                        annotations.append({"page": data.get("page", 1), "data": data})
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
