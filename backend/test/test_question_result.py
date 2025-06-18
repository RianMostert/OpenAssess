def test_create_question_result(client, student, assessment, question, marker):
    response = client.post(
        "/api/v1/question-results/",
        json={
            "student_id": str(student.id),
            "assessment_id": str(assessment.id),
            "question_id": str(question.id),
            "marker_id": str(marker.id),
            "mark": 7.5,
            "comment": "Good work",
            "annotation_file_path": "/annotations/q1.json",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["mark"] == 7.5
    assert data["comment"] == "Good work"
    assert data["annotation_file_path"] == "/annotations/q1.json"


def test_get_question_result(client, question_result):
    response = client.get(f"/api/v1/question-results/{question_result.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(question_result.id)
    assert data["mark"] == question_result.mark


def test_update_question_result(client, question_result):
    response = client.patch(
        f"/api/v1/question-results/{question_result.id}", json={"mark": 8.0}
    )
    assert response.status_code == 200
    assert response.json()["mark"] == 8.0


def test_delete_question_result(client, question_result):
    response = client.delete(f"/api/v1/question-results/{question_result.id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Question result deleted"

    # Confirm deletion
    follow_up = client.get(f"/api/v1/question-results/{question_result.id}")
    assert follow_up.status_code == 404
