def test_create_uploaded_file(client, assessment, student, teacher):
    response = client.post(
        "/api/v1/uploaded-files/",
        json={
            "assessment_id": str(assessment.id),
            "student_id": str(student.id),
            "answer_sheet_file_path": "/files/answer.pdf",
            "uploaded_by": str(teacher.id),
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["answer_sheet_file_path"] == "/files/answer.pdf"
    assert data["student_id"] == str(student.id)


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

    # Confirm deletion
    follow_up = client.get(f"/api/v1/uploaded-files/{uploaded_file.id}")
    assert follow_up.status_code == 404
