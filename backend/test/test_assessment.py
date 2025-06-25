import tempfile
from pathlib import Path
from test.conftest import auth_headers


def test_create_assessment(client, course, teacher):
    headers = auth_headers(teacher)
    response = client.post(
        "/api/v1/assessments/",
        json={
            "title": "Midterm Exam",
            "course_id": str(course.id),
            "question_paper_file_path": "/files/midterm.pdf",
        },
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Midterm Exam"
    assert data["course_id"] == str(course.id)


def test_get_assessment_by_id(client, assessment, teacher):
    headers = auth_headers(teacher)
    response = client.get(f"/api/v1/assessments/{assessment.id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(assessment.id)
    assert data["title"] == assessment.title


def test_update_assessment(client, assessment, teacher):
    headers = auth_headers(teacher)
    response = client.patch(
        f"/api/v1/assessments/{assessment.id}",
        json={"title": "Updated Exam"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Updated Exam"


def test_delete_assessment(client, assessment, teacher):
    headers = auth_headers(teacher)
    response = client.delete(f"/api/v1/assessments/{assessment.id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Assessment deleted"

    follow_up = client.get(f"/api/v1/assessments/{assessment.id}", headers=headers)
    assert follow_up.status_code == 404


def test_upload_assessment_with_pdf(client, course, teacher):
    headers = auth_headers(teacher)
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(b"%PDF-1.4\n%Test PDF content\n%%EOF")
        tmp_path = tmp.name

    with open(tmp_path, "rb") as pdf_file:
        response = client.post(
            "/api/v1/assessments/upload",
            data={"title": "Midterm", "course_id": str(course.id)},
            files={"file": ("midterm.pdf", pdf_file, "application/pdf")},
            headers=headers,
        )

    Path(tmp_path).unlink()

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["title"] == "Midterm"
    assert data["course_id"] == str(course.id)
    assert data["question_paper_file_path"].endswith(".pdf")

    stored_path = Path(data["question_paper_file_path"])
    if stored_path.exists():
        stored_path.unlink()


def test_download_assessment_question_paper(client, course, teacher):
    headers = auth_headers(teacher)
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(b"%PDF-1.4\nTest question paper")
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            upload_response = client.post(
                "/api/v1/assessments/upload",
                data={"title": "Final Exam", "course_id": str(course.id)},
                files={"file": ("exam.pdf", f, "application/pdf")},
                headers=headers,
            )

        assert upload_response.status_code == 200
        assessment_id = upload_response.json()["id"]

        response = client.get(
            f"/api/v1/assessments/{assessment_id}/question-paper", headers=headers
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert b"%PDF-1.4" in response.content

        path = Path(upload_response.json()["question_paper_file_path"])
        if path.exists():
            path.unlink()

    finally:
        Path(tmp_path).unlink()
