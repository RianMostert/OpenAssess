import json
from .conftest import auth_headers
from pathlib import Path
import tempfile


def test_create_question_result(client, student, assessment, question, marker):
    headers = auth_headers(marker)
    response = client.post(
        "/api/v1/question-results/",
        json={
            "student_id": str(student.id),
            "assessment_id": str(assessment.id),
            "question_id": str(question.id),
            "mark": 7.5,
            "comment": "Good work",
            "annotation_file_path": "/annotations/q1.json",
        },
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["mark"] == 7.5


def test_get_question_result(client, question_result, marker):
    headers = auth_headers(marker)
    response = client.get(
        f"/api/v1/question-results/{question_result.id}", headers=headers
    )
    assert response.status_code == 200


def test_update_question_result(client, question_result, marker):
    headers = auth_headers(marker)
    response = client.patch(
        f"/api/v1/question-results/{question_result.id}",
        json={"mark": 8.0},
        headers=headers,
    )
    assert response.status_code == 200


def test_delete_question_result(client, question_result, marker):
    headers = auth_headers(marker)
    response = client.delete(
        f"/api/v1/question-results/{question_result.id}", headers=headers
    )
    assert response.status_code == 200

    follow_up = client.get(
        f"/api/v1/question-results/{question_result.id}", headers=headers
    )
    assert follow_up.status_code == 404


def test_upload_annotation_file(client, student, assessment, question, marker):
    headers = auth_headers(marker)
    annotation_data = {"highlights": [1, 2, 3], "notes": "Focus on part B"}
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as tmp:
        json.dump(annotation_data, tmp)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as json_file:
            response = client.post(
                "/api/v1/question-results/upload-annotation",
                data={
                    "student_id": str(student.id),
                    "assessment_id": str(assessment.id),
                    "question_id": str(question.id),
                    "mark": 9.0,
                    "comment": "Great improvement",
                },
                files={"file": ("annotation.json", json_file, "application/json")},
                headers=headers,
            )

        assert response.status_code == 200
        path = Path(response.json()["annotation_file_path"])
        if path.exists():
            path.unlink()
    finally:
        Path(tmp_path).unlink()


def test_download_annotation_file(client, student, assessment, question, marker):
    headers = auth_headers(marker)
    with tempfile.NamedTemporaryFile(suffix=".json", mode="w", delete=False) as tmp:
        tmp.write('{"note": "Important section"}')
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            upload_response = client.post(
                "/api/v1/question-results/upload-annotation",
                data={
                    "student_id": str(student.id),
                    "assessment_id": str(assessment.id),
                    "question_id": str(question.id),
                    "mark": 8.5,
                    "comment": "Marked section",
                },
                files={"file": ("annotation.json", f, "application/json")},
                headers=headers,
            )

        result_id = upload_response.json()["id"]
        response = client.get(
            f"/api/v1/question-results/{result_id}/annotation", headers=headers
        )
        assert response.status_code == 200
        assert b"Important section" in response.content

        path = Path(upload_response.json()["annotation_file_path"])
        if path.exists():
            path.unlink()

    finally:
        Path(tmp_path).unlink()
