import pytest

def test_user_registration(client):
    payload = {
        "workspace_name": "Apex Dental Clinic",
        "full_name": "Dr. Alex Vance",
        "email": "alex@apexdental.com",
        "password": "securepassword123",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "alex@apexdental.com"
    assert data["user"]["role"] == "owner"

def test_user_login(client):
    # Register first
    client.post(
        "/api/v1/auth/register",
        json={
            "workspace_name": "Login Test Workspace",
            "full_name": "John Doe",
            "email": "john@example.com",
            "password": "mypassword123",
        },
    )

    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "john@example.com", "password": "mypassword123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "john@example.com"

def test_passkey_login_success(client):
    # Passkey 3400 specified in design blueprint
    response = client.post("/api/v1/auth/passkey", json={"passkey": "3400"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data

def test_passkey_login_invalid(client):
    response = client.post("/api/v1/auth/passkey", json={"passkey": "9999"})
    assert response.status_code == 401
