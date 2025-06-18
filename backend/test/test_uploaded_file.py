import tempfile
from pathlib import Path


def test_create_uploaded_file_with_pdf(client, assessment, student, teacher):
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(b"%PDF-1.4\n%Test PDF content\n%%EOF")
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as pdf_file:
            response = client.post(
                "/api/v1/uploaded-files/upload",
                data={
                    "assessment_id": str(assessment.id),
                    "student_id": str(student.id),
                    "uploaded_by": str(teacher.id),
                },
                files={"file": ("test.pdf", pdf_file, "application/pdf")},
            )

        assert response.status_code == 200, response.text
        data = response.json()
        assert data["student_id"] == str(student.id)
        assert data["assessment_id"] == str(assessment.id)
        assert data["uploaded_by"] == str(teacher.id)
        assert data["answer_sheet_file_path"].endswith(".pdf")

        # Clean up uploaded file from app storage
        stored_file_path = Path(data["answer_sheet_file_path"])
        if stored_file_path.exists():
            stored_file_path.unlink()

    finally:
        Path(tmp_path).unlink()  # clean up temp input file


def test_get_uploaded_file(client, uploaded_file):
    response = client.get(f"/api/v1/uploaded-files/{uploaded_file.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(uploaded_file.id)


def test_update_uploaded_file(client, uploaded_file):
    response = client.patch(
        f"/api/v1/uploaded-files/{uploaded_file.id}",
        json={"answer_sheet_file_path": "/files/updated.pdf"},
    )
    assert response.status_code == 200
    assert response.json()["answer_sheet_file_path"] == "/files/updated.pdf"


def test_delete_uploaded_file(client, uploaded_file):
    response = client.delete(f"/api/v1/uploaded-files/{uploaded_file.id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Uploaded file deleted"

    follow_up = client.get(f"/api/v1/uploaded-files/{uploaded_file.id}")
    assert follow_up.status_code == 404
