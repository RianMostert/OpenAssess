def test_create_question(client, assessment):
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
    )
    assert response.status_code == 200
    data = response.json()
    assert data["question_number"] == "1.1"
    assert data["max_marks"] == 10.0


def test_get_question(client, question):
    response = client.get(f"/api/v1/questions/{question.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(question.id)
    assert data["question_number"] == question.question_number


def test_update_question(client, question):
    response = client.patch(
        f"/api/v1/questions/{question.id}", json={"memo": "Updated memo"}
    )
    assert response.status_code == 200
    assert response.json()["memo"] == "Updated memo"


def test_delete_question(client, question):
    response = client.delete(f"/api/v1/questions/{question.id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Question deleted"

    # Confirm deletion
    follow_up = client.get(f"/api/v1/questions/{question.id}")
    assert follow_up.status_code == 404
