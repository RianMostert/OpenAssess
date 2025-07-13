def test_signup_success(client, db_session):
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "first_name": "New",
            "last_name": "User",
            "email": "newuser@example.com",
            "student_number": "12345678",
            "password": "securepass",
            "primary_role_id": 3,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert "id" in data


def test_signup_duplicate_email(client, student):
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "first_name": "Dup",
            "last_name": "User",
            "email": student.email,  # already taken
            "student_number": "99999999",
            "password": "anotherpass",
            "primary_role_id": 3,  # assuming role ID 3 exists
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"


def test_login_success(client, student):
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": student.email,
            "password": "studentpass",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_password(client, student):
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": student.email,
            "password": "wrongpassword",
        },
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


def test_login_nonexistent_user(client):
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "nosuchuser@example.com",
            "password": "irrelevant",
        },
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"
