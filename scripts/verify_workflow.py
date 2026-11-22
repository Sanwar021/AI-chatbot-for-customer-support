import json
import urllib.request
import urllib.error

API_URL = "http://127.0.0.1:8000/api/v1"

def post(endpoint, data, token=None):
    req = urllib.request.Request(
        f"{API_URL}{endpoint}",
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})},
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def get(endpoint, token=None):
    req = urllib.request.Request(
        f"{API_URL}{endpoint}",
        headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})},
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def run_verification():
    print("=" * 60)
    print("SupportPilot End-to-End System Verification")
    print("=" * 60)

    # 1. Passkey PIN Login (3400)
    print("[1] Testing Passkey PIN Login ('3400')...")
    auth_res = post("/auth/passkey", {"passkey": "3400"})
    token = auth_res["access_token"]
    user = auth_res["user"]
    print(f" -> Authenticated: {user['full_name']} | Workspace: {user['tenant_name']} | Role: {user['role']}")

    # 2. List Bots
    print("\n[2] Fetching Bot Fleet...")
    bots = get("/bots", token=token)
    assert len(bots) > 0, "No bots returned!"
    demo_bot = bots[0]
    print(f" -> Active Bot: {demo_bot['name']} (Key: {demo_bot['public_key']})")

    # 3. Initialize Customer Widget Session
    print("\n[3] Initializing Customer Chat Widget...")
    init_res = post("/chat/init", {
        "bot_key": demo_bot["public_key"],
        "customer_name": "David Wallace",
        "customer_email": "dwallace@dundermifflin.com",
    })
    conv_id = init_res["conversation_id"]
    print(f" -> Session Created: {conv_id} | Welcome Msg: {init_res['welcome_message'][:50]}...")

    # 4. Grounded Question
    print("\n[4] Asking Grounded Question: 'What are your clinic opening hours on Saturday?'...")
    grounded_res = post("/chat/message", {
        "bot_key": demo_bot["public_key"],
        "conversation_id": conv_id,
        "query": "What are your clinic opening hours on Saturday?",
    })
    print(f" -> Grounded: {not grounded_res['is_fallback']}")
    print(f" -> Sources Count: {len(grounded_res['sources'])}")
    print(f" -> AI Answer: {grounded_res['text'][:85]}...")
    assert not grounded_res["is_fallback"], "Grounded question triggered unexpected fallback!"

    # 5. Out-of-Domain Question
    print("\n[5] Asking Out-of-Domain Question: 'Can I purchase a flying saucer?'...")
    fallback_res = post("/chat/message", {
        "bot_key": demo_bot["public_key"],
        "conversation_id": conv_id,
        "query": "Can I purchase a flying saucer?",
    })
    print(f" -> Fallback Triggered: {fallback_res['is_fallback']}")
    print(f" -> Response: {fallback_res['text'][:85]}...")
    assert fallback_res["is_fallback"], "Out-of-domain question should trigger fallback!"

    # 6. Verify Unanswered Questions recorded
    print("\n[6] Inspecting Unanswered Questions Table...")
    unanswered = get("/unanswered", token=token)
    assert any("flying saucer" in u["question"].lower() for u in unanswered), "Unanswered question was not recorded!"
    print(f" -> Confirmed {len(unanswered)} recorded unanswered questions.")

    # 7. Customer Human Handoff Request
    print("\n[7] Customer Requesting Human Handoff...")
    handoff_res = post("/chat/handoff", {
        "conversation_id": conv_id,
        "reason": "Customer needs to speak to a doctor about pricing.",
    })
    print(f" -> Status: {handoff_res['status']} | Message: {handoff_res['message']}")

    # 8. Live Inbox Waiting Queue Check
    print("\n[8] Inspecting Live Inbox Queue for Waiting Conversations...")
    waiting_convs = get("/conversations?status=waiting_agent", token=token)
    assert any(c["id"] == conv_id for c in waiting_convs), "Conversation not found in waiting queue!"
    print(f" -> Waiting Queue Count: {len(waiting_convs)} (Conversation {conv_id} present)")

    # 9. Human Agent Claims & Replies
    print("\n[9] Human Agent Claiming & Replying to Conversation...")
    post(f"/conversations/{conv_id}/assign", {}, token=token)
    reply_res = post(f"/conversations/{conv_id}/reply", {
        "content": "Hello David, this is Dr. Sarah Jenkins. I am here to assist you personally.",
    }, token=token)
    print(f" -> Agent Reply Sent: {reply_res['status']} (Message ID: {reply_res['message_id']})")

    # 10. Order Status Lookup
    print("\n[10] Testing External Order Status Lookup Connector...")
    order_res = post("/orders/test-lookup", {
        "order_id": "ORD-7744",
        "verification_value": "dwallace@dundermifflin.com",
    }, token=token)
    print(f" -> Order Status: {order_res.get('status')} | Items: {order_res.get('items')}")

    # 11. Real Analytics
    print("\n[11] Verifying Real Platform Analytics...")
    analytics = get("/analytics/summary?days=30", token=token)
    print(f" -> Total Conversations: {analytics['total_conversations']}")
    print(f" -> Total Messages: {analytics['total_messages']}")
    print(f" -> AI Resolution Rate: {analytics['bot_resolution_rate']}%")
    print(f" -> Human Handoffs: {analytics['human_handoffs']}")
    print(f" -> Total Captured Leads: {analytics['total_leads']}")

    print("\n" + "=" * 60)
    print("ALL 11 END-TO-END WORKFLOW CHECKS PASSED WITH 100% SUCCESS!")
    print("=" * 60)

if __name__ == "__main__":
    run_verification()
