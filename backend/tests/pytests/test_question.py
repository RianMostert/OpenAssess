from .conftest import auth_headers


def test_create_question(client, assessment, teacher):
    headers = auth_headers(teacher)
    response = client.post(
        "/api/v1/questions/",
        json={
            "assessment_id": str(assessment.id),
            "question_number": "1.1",
            "max_marks": 10.0,
            "increment": 0.5,
            "memo": "Define X",
            "page_number": 1,
        },
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["question_number"] == "1.1"
    assert data["max_marks"] == 10.0


def test_get_question(client, question, teacher):
    headers = auth_headers(teacher)
    response = client.get(f"/api/v1/questions/{question.id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(question.id)
    assert data["question_number"] == question.question_number


def test_update_question(client, question, teacher):
    headers = auth_headers(teacher)
    response = client.patch(
        f"/api/v1/questions/{question.id}",
        json={"memo": "Updated memo"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["memo"] == "Updated memo"


def test_delete_question(client, question, teacher):
    headers = auth_headers(teacher)
    response = client.delete(f"/api/v1/questions/{question.id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Question deleted"

    # Confirm deletion
    follow_up = client.get(f"/api/v1/questions/{question.id}", headers=headers)
    assert follow_up.status_code == 404
