from pathlib import Path
import zipfile
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.core.config import settings
import json
import tempfile

from app.schemas.uploaded_file import ExportRequest
from app.services.pdf_annotation_service import pdf_annotation_service

router = APIRouter(prefix="/export", tags=["Export"])


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
                        
                        # Convert API format to PDF service format
                        # API uses: {color, width} -> PDF service expects: {stroke, strokeWidth}
                        # Keep fine-eraser strokes - they're needed for the erasing process
                        converted_data = data.copy()
                        if "lines" in converted_data:
                            converted_data["lines"] = [
                                {
                                    "points": line.get("points", []),
                                    "stroke": line.get("color", "#ff0000"),  # API: color -> stroke
                                    "strokeWidth": line.get("width", 2),      # API: width -> strokeWidth
                                    "tool": line.get("tool", "pencil"),       # Preserve tool type
                                }
                                for line in converted_data["lines"]
                            ]
                        
                        # Add fontSize to texts
                        if "texts" in converted_data:
                            converted_data["texts"] = [
                                {
                                    **text,
                                    "fontSize": text.get("fontSize", 16),  # Default to 16 if not present
                                }
                                for text in converted_data["texts"]
                            ]
                        
                        # Add fontSize to stickyNotes
                        if "stickyNotes" in converted_data:
                            converted_data["stickyNotes"] = [
                                {
                                    **sticky,
                                    "fontSize": sticky.get("fontSize", 14),  # Default to 14 if not present
                                }
                                for sticky in converted_data["stickyNotes"]
                            ]
                        
                        annotations.append({"page": page_number, "data": converted_data})
                except Exception:
                    # Skip invalid annotation files
                    continue

            if not annotations:
                continue

            output_pdf = temp_dir / f"{student_id}_annotated.pdf"
            pdf_annotation_service.burn_annotations_to_pdf(
                str(pdf_file), str(output_pdf), annotations
            )
            zipf.write(output_pdf, arcname=f"{student_id}.pdf")

    return FileResponse(
        zip_path, filename="annotated_pdfs.zip", media_type="application/zip"
    )
