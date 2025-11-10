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
                        annotations.append({"page": page_number, "data": data})
                except Exception as e:
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
