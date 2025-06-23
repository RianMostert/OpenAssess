def test_create_user(client):
    response = client.post(
        "/api/v1/users/",
        json={
            "first_name": "Alice",
            "last_name": "Test",
            "email": "alice@example.com",
            "student_number": "12345678",
            "password": "securepassword",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["email"] == "alice@example.com"


def test_get_user_by_id(client):
    create_response = client.post(
        "/api/v1/users/",
        json={
            "first_name": "Bob",
            "last_name": "Builder",
            "email": "bob@example.com",
            "student_number": "87654321",
            "password": "buildit",
        },
    )
    user_id = create_response.json()["id"]

    response = client.get(f"/api/v1/users/{user_id}")
    assert response.status_code == 200
    assert response.json()["email"] == "bob@example.com"


def test_list_users(client):
    response = client.get("/api/v1/users/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_update_user(client):
    create_response = client.post(
        "/api/v1/users/",
        json={
            "first_name": "Charlie",
            "last_name": "Change",
            "email": "charlie@example.com",
            "student_number": "11112222",
            "password": "pass1234",
        },
    )
    user_id = create_response.json()["id"]

    update_response = client.patch(
        f"/api/v1/users/{user_id}", json={"first_name": "Charles"}
    )

    assert update_response.status_code == 200
    assert update_response.json()["first_name"] == "Charles"


def test_delete_user(client):
    create_response = client.post(
        "/api/v1/users/",
        json={
            "first_name": "Dana",
            "last_name": "Delete",
            "email": "dana@example.com",
            "student_number": "33334444",
            "password": "remove",
        },
    )
    user_id = create_response.json()["id"]

    delete_response = client.delete(f"/api/v1/users/{user_id}")
    assert delete_response.status_code == 200

    follow_up = client.get(f"/api/v1/users/{user_id}")
    assert follow_up.status_code == 404


# def test_assign_role_to_user_in_course(client, db_session, teacher, student, course):
#     from app.models.user_course_role import UserCourseRole

#     response = client.post(
#         "/api/v1/user-roles/assign",
#         json={
#             "user_id": str(student.id),
#             "course_id": str(course.id),
#             "role_name": "ta",
#         },
#     )

#     assert response.status_code == 200, response.text
#     data = response.json()
#     assert data["course_id"] == str(course.id)
#     assert data["role"]["name"] == "ta"

#     db_entry = (
#         db_session.query(UserCourseRole)
#         .filter_by(user_id=student.id, course_id=course.id)
#         .first()
#     )
#     assert db_entry is not None
#     assert db_entry.role.name == "ta"
