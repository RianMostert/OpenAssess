def test_create_course(client, teacher):
    response = client.post(
        "/api/v1/courses/",
        json={
            "title": "Computer Science",
            "teacher_id": str(teacher.id),
            "code": "244",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Computer Science"
    assert data["code"] == "244"
    assert data["teacher_id"] == str(teacher.id)


def test_get_course_by_id(client, course):
    response = client.get(f"/api/v1/courses/{course.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(course.id)
    assert data["title"] == course.title


def test_update_course(client, course):
    response = client.patch(
        f"/api/v1/courses/{course.id}", json={"title": "Computer Science 244"}
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Computer Science 244"


def test_delete_course(client, course):
    response = client.delete(f"/api/v1/courses/{course.id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Course deleted"

    # Confirm deletion
    follow_up = client.get(f"/api/v1/courses/{course.id}")
    assert follow_up.status_code == 404
