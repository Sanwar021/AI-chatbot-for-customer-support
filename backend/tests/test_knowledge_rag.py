import pytest

def test_rag_flow_grounded_answer(client):
    # Register business
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "workspace_name": "Smile Clinic",
            "full_name": "Dentist Dan",
            "email": "dan@smileclinic.com",
            "password": "password123",
        },
    ).json()
    headers = {"Authorization": f"Bearer {reg['access_token']}"}

    # Create Bot
    bot = client.post("/api/v1/bots", headers=headers, json={"name": "SmileBot", "language": "multi"}).json()
    bot_id = bot["id"]
    bot_key = bot["public_key"]

    # Add FAQ: Opening hours
    faq = client.post(
        "/api/v1/knowledge/faqs",
        headers=headers,
        json={
            "bot_id": bot_id,
            "question": "What are your business hours?",
            "answer": "We are open Monday to Friday from 8am to 6pm.",
            "category": "General",
        },
    ).json()
    assert faq["id"] is not None

    # Init chat session
    init_res = client.post("/api/v1/chat/init", json={"bot_key": bot_key}).json()
    conv_id = init_res["conversation_id"]

    # Ask grounded question
    chat_res = client.post(
        "/api/v1/chat/message",
        json={
            "bot_key": bot_key,
            "conversation_id": conv_id,
            "query": "What are your business hours?",
        },
    ).json()

    assert chat_res["is_fallback"] is False
    assert len(chat_res["sources"]) > 0
    assert "8am to 6pm" in chat_res["text"] or "hours" in chat_res["text"].lower()

def test_rag_flow_ungrounded_fallback(client):
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "workspace_name": "Fallback Test Clinic",
            "full_name": "Nurse Joy",
            "email": "joy@fallback.com",
            "password": "password123",
        },
    ).json()
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    bot = client.post("/api/v1/bots", headers=headers, json={"name": "FallbackBot"}).json()

    init_res = client.post("/api/v1/chat/init", json={"bot_key": bot["public_key"]}).json()
    conv_id = init_res["conversation_id"]

    # Ask ungrounded question (not in knowledge base)
    chat_res = client.post(
        "/api/v1/chat/message",
        json={
            "bot_key": bot["public_key"],
            "conversation_id": conv_id,
            "query": "What is the secret flight schedule to planet Jupiter?",
        },
    ).json()

    assert chat_res["is_fallback"] is True
    assert "knowledge base" in chat_res["text"].lower() or "human" in chat_res["text"].lower()

    # Check unanswered questions endpoint
    unanswered = client.get("/api/v1/unanswered", headers=headers).json()
    questions = [u["question"] for u in unanswered]
    assert "What is the secret flight schedule to planet Jupiter?" in questions
