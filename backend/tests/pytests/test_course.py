from .conftest import auth_headers


def test_create_course(client, teacher):
    headers = auth_headers(teacher)
    response = client.post(
        "/api/v1/courses/",
        json={
            "title": "Computer Science",
            "teacher_id": str(teacher.id),
            "code": "244",
        },
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Computer Science"
    assert data["code"] == "244"
    assert data["teacher_id"] == str(teacher.id)


def test_get_course_by_id(client, course, teacher):
    headers = auth_headers(teacher)
    response = client.get(f"/api/v1/courses/{course.id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(course.id)
    assert data["title"] == course.title


def test_update_course(client, course, teacher):
    headers = auth_headers(teacher)
    response = client.patch(
        f"/api/v1/courses/{course.id}",
        json={"title": "Computer Science 244"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Computer Science 244"


def test_delete_course(client, course, teacher):
    headers = auth_headers(teacher)
    response = client.delete(f"/api/v1/courses/{course.id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Course deleted"

    follow_up = client.get(f"/api/v1/courses/{course.id}", headers=headers)
    assert follow_up.status_code == 404


def test_student_cannot_create_course(client, student):
    headers = auth_headers(student)
    response = client.post(
        "/api/v1/courses/",
        json={
            "title": "Blocked Course",
            "teacher_id": str(student.id),
            "code": "BLOCKED",
        },
        headers=headers,
    )
    assert response.status_code == 403
