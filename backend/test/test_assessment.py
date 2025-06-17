def test_create_assessment(client, course):
    response = client.post(
        "/api/v1/assessments/",
        json={
            "title": "Midterm Exam",
            "course_id": str(course.id),
            "question_paper_file_path": "/files/midterm.pdf",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Midterm Exam"
    assert data["course_id"] == str(course.id)


def test_get_assessment_by_id(client, assessment):
    response = client.get(f"/api/v1/assessments/{assessment.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(assessment.id)
    assert data["title"] == assessment.title


def test_update_assessment(client, assessment):
    response = client.patch(
        f"/api/v1/assessments/{assessment.id}", json={"title": "Updated Exam"}
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Updated Exam"


def test_delete_assessment(client, assessment):
    response = client.delete(f"/api/v1/assessments/{assessment.id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Assessment deleted"

    # Confirm deletion
    follow_up = client.get(f"/api/v1/assessments/{assessment.id}")
    assert follow_up.status_code == 404
