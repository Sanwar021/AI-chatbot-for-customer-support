import pytest

def test_tenant_data_isolation(client):
    # 1. Register Tenant A
    resp_a = client.post(
        "/api/v1/auth/register",
        json={
            "workspace_name": "Tenant Alpha Clinic",
            "full_name": "Alpha Admin",
            "email": "alpha@tenant-a.com",
            "password": "password123",
        },
    )
    assert resp_a.status_code == 200
    token_a = resp_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register Tenant B
    resp_b = client.post(
        "/api/v1/auth/register",
        json={
            "workspace_name": "Tenant Beta Logistics",
            "full_name": "Beta Admin",
            "email": "beta@tenant-b.com",
            "password": "password123",
        },
    )
    assert resp_b.status_code == 200
    token_b = resp_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. Tenant A creates Bot A
    bot_a_resp = client.post(
        "/api/v1/bots",
        headers=headers_a,
        json={"name": "Alpha Bot", "language": "en"},
    )
    assert bot_a_resp.status_code == 200
    bot_a_id = bot_a_resp.json()["id"]

    # 4. Tenant B creates Bot B
    bot_b_resp = client.post(
        "/api/v1/bots",
        headers=headers_b,
        json={"name": "Beta Bot", "language": "en"},
    )
    assert bot_b_resp.status_code == 200
    bot_b_id = bot_b_resp.json()["id"]

    # Verification 1: Tenant A cannot see Tenant B's bot
    bots_list_a = client.get("/api/v1/bots", headers=headers_a).json()
    bot_ids_a = [b["id"] for b in bots_list_a]
    assert bot_a_id in bot_ids_a
    assert bot_b_id not in bot_ids_a

    # Verification 2: Tenant A cannot modify Tenant B's bot settings
    tamper_resp = client.put(
        f"/api/v1/bots/{bot_b_id}",
        headers=headers_a,
        json={"name": "Hacked Bot Name"},
    )
    assert tamper_resp.status_code == 404, "Tenant A was able to access Tenant B's bot!"

    # Verification 3: Tenant A cannot view Tenant B's bot directly
    tamper_view = client.get(f"/api/v1/bots/{bot_b_id}", headers=headers_a)
    assert tamper_view.status_code == 404

    # Verification 4: Tenant A creates FAQ, Tenant B cannot see it
    faq_a = client.post(
        "/api/v1/knowledge/faqs",
        headers=headers_a,
        json={"bot_id": bot_a_id, "question": "Confidential Question A", "answer": "Answer A"},
    )
    assert faq_a.status_code == 200
    faq_a_id = faq_a.json()["id"]

    faqs_b = client.get("/api/v1/knowledge/faqs", headers=headers_b).json()
    faq_ids_b = [f["id"] for f in faqs_b]
    assert faq_a_id not in faq_ids_b, "Tenant B leaked Tenant A's FAQ!"

    # Verification 5: Tenant B cannot tamper with Tenant A's FAQ
    faq_tamper = client.put(
        f"/api/v1/knowledge/faqs/{faq_a_id}",
        headers=headers_b,
        json={"question": "Tampered"},
    )
    assert faq_tamper.status_code == 404

    # Verification 6: Tenant A captures a lead, Tenant B cannot access it
    lead_a = client.post(
        "/api/v1/leads",
        headers=headers_a,
        json={"bot_id": bot_a_id, "name": "Confidential Lead", "email": "lead@clienta.com"},
    )
    assert lead_a.status_code == 200

    leads_b = client.get("/api/v1/leads", headers=headers_b).json()
    lead_emails_b = [l["email"] for l in leads_b]
    assert "lead@clienta.com" not in lead_emails_b, "Tenant B leaked Tenant A's lead!"

    # Verification 7: Tenant A creates API key, Tenant B cannot view or delete it
    key_a = client.post("/api/v1/settings/api-keys", headers=headers_a, json={"name": "Alpha Key"}).json()
    key_a_id = key_a["id"]

    keys_b = client.get("/api/v1/settings/api-keys", headers=headers_b).json()
    key_ids_b = [k["id"] for k in keys_b]
    assert key_a_id not in key_ids_b

    key_del_tamper = client.delete(f"/api/v1/settings/api-keys/{key_a_id}", headers=headers_b)
    assert key_del_tamper.status_code == 404
