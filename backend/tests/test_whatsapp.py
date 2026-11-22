import pytest

def test_whatsapp_webhook_verification(client):
    # Valid verification challenge
    resp = client.get(
        "/api/v1/whatsapp/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "supportpilot_demo_verify_token",
            "hub.challenge": "1155993322",
        },
    )
    assert resp.status_code == 200
    assert resp.text == "1155993322"

def test_whatsapp_webhook_verification_mismatch(client):
    resp = client.get(
        "/api/v1/whatsapp/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "wrong_token",
            "hub.challenge": "1155993322",
        },
    )
    assert resp.status_code == 403

def test_whatsapp_mock_simulation_and_conversation_routing(client):
    # Register & bot
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "workspace_name": "WhatsApp Dental Lab",
            "full_name": "Admin WA",
            "email": "wa@demodental.com",
            "password": "password123",
        },
    ).json()
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    bot = client.post("/api/v1/bots", headers=headers, json={"name": "WhatsAppBot"}).json()

    # Save WhatsApp integration credentials
    save_resp = client.post(
        "/api/v1/whatsapp/config",
        headers=headers,
        json={
            "bot_id": bot["id"],
            "phone_number_id": "1009922883377",
            "access_token": "mock_whatsapp_access_token",
            "verify_token": "wa_custom_verify_token",
            "display_phone_number": "+1 555-0100",
        },
    )
    assert save_resp.status_code == 200

    # Simulate incoming WhatsApp message
    mock_send = client.post(
        "/api/v1/whatsapp/test-mock",
        headers=headers,
        json={
            "sender_phone": "8801711223344",
            "sender_name": "Rahim Khan",
            "message_text": "Hello, what are your opening hours?",
        },
    )
    assert mock_send.status_code == 200
    assert mock_send.json()["status"] == "success"

    # Verify conversation was automatically recorded under channel='whatsapp'
    convs = client.get("/api/v1/conversations?channel=whatsapp", headers=headers).json()
    assert len(convs) >= 1
    assert convs[0]["channel"] == "whatsapp"
    assert convs[0]["customer_phone"] == "8801711223344"
