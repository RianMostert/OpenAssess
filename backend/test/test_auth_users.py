from test.conftest import auth_headers


def test_create_user(client, admin):
    headers = auth_headers(admin)
    payload = {
        "first_name": "Test",
        "last_name": "User",
        "email": "test@example.com",
        "student_number": "87654321",
        "password": "testpass",
        "is_admin": False,
    }
    response = client.post("/api/v1/users/", json=payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"


def test_user_out_includes_is_admin(client, admin):
    headers = auth_headers(admin)
    response = client.get(f"/api/v1/users/{admin.id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["is_admin"] is True


def test_unauthorized_access_denied(client):
    response = client.get("/api/v1/users/")
    assert response.status_code == 401


def test_non_admin_cannot_list_users(client, student):
    headers = auth_headers(student)
    response = client.get("/api/v1/users/", headers=headers)
    assert response.status_code == 403


def test_admin_can_list_users(client, admin):
    headers = auth_headers(admin)
    response = client.get("/api/v1/users/", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_user_self(client, student):
    headers = auth_headers(student)
    response = client.get(f"/api/v1/users/{student.id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == student.email


def test_get_user_other_forbidden(client, student, teacher):
    headers = auth_headers(student)
    response = client.get(f"/api/v1/users/{teacher.id}", headers=headers)
    assert response.status_code == 403


def test_admin_can_get_any_user(client, admin, teacher):
    headers = auth_headers(admin)
    response = client.get(f"/api/v1/users/{teacher.id}", headers=headers)
    assert response.status_code == 200


def test_user_can_update_self(client, student):
    headers = auth_headers(student)
    response = client.patch(
        f"/api/v1/users/{student.id}",
        json={"first_name": "UpdatedName"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["first_name"] == "UpdatedName"


def test_user_cannot_update_others(client, student, teacher):
    headers = auth_headers(student)
    response = client.patch(
        f"/api/v1/users/{teacher.id}",
        json={"first_name": "Hacker"},
        headers=headers,
    )
    assert response.status_code == 403


def test_admin_can_update_any_user(client, admin, student):
    headers = auth_headers(admin)
    response = client.patch(
        f"/api/v1/users/{student.id}",
        json={"last_name": "AdminUpdated"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["last_name"] == "AdminUpdated"


def test_non_admin_cannot_delete_user(client, teacher, student):
    headers = auth_headers(teacher)
    response = client.delete(f"/api/v1/users/{student.id}", headers=headers)
    assert response.status_code == 403


def test_admin_can_delete_user(client, admin, student):
    headers = auth_headers(admin)
    response = client.delete(f"/api/v1/users/{student.id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["id"] == str(student.id)
