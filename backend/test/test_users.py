def test_create_user(client):
    response = client.post(
        "/api/v1/users/",
        json={
            "first_name": "Alice",
            "last_name": "Test",
            "email": "alice@example.com",
            "student_number": "12345678",
            "password": "securepassword",
            "role": "student",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["email"] == "alice@example.com"
    assert data["role"] == "student"


def test_get_user_by_id(client):
    # First, create a user
    create_response = client.post(
        "/api/v1/users/",
        json={
            "first_name": "Bob",
            "last_name": "Builder",
            "email": "bob@example.com",
            "student_number": "87654321",
            "password": "buildit",
            "role": "teacher",
        },
    )
    user_id = create_response.json()["id"]

    # Then fetch the user
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
            "role": "ta",
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
            "role": "admin",
        },
    )
    user_id = create_response.json()["id"]

    delete_response = client.delete(f"/api/v1/users/{user_id}")
    assert delete_response.status_code == 200

    # Confirm deletion
    follow_up = client.get(f"/api/v1/users/{user_id}")
    assert follow_up.status_code == 404
