# SupportPilot Database Schema Specification

### 1. Entities & Relations

The schema fulfills the entire multi-tenant data model specified in Section 4:

1. **Tenant**: Workspace root (`id`, `name`, `slug`, `plan_id`, `is_active`, `created_at`, `updated_at`).
2. **User**: Authentication & membership (`id`, `tenant_id`, `email`, `hashed_password`, `full_name`, `role`, `is_active`, `is_verified`, `created_at`).
3. **UserInvitation**: Team invitations (`id`, `tenant_id`, `email`, `role`, `token`, `expires_at`, `status`).
4. **Bot**: Chatbots per tenant (`id`, `tenant_id`, `name`, `public_key`, `avatar_url`, `is_active`, `language`, `created_at`).
5. **BotSettings**: Bot customization (`id`, `bot_id`, `system_prompt`, `welcome_message`, `fallback_message`, `primary_color`, `position`, `suggested_questions`, `pre_chat_form_enabled`, `allowed_domains`).
6. **Document**: Knowledge base files (`id`, `tenant_id`, `bot_id`, `name`, `file_type`, `file_size`, `status`, `error_message`, `source_url`, `created_at`).
7. **DocumentChunk**: RAG text chunks (`id`, `document_id`, `tenant_id`, `bot_id`, `content`, `chunk_index`, `embedding`, `metadata`).
8. **FAQ**: Structured Q&A pairs (`id`, `tenant_id`, `bot_id`, `question`, `answer`, `category`, `is_active`, `created_at`).
9. **Conversation**: Customer sessions (`id`, `tenant_id`, `bot_id`, `channel`, `customer_id`, `customer_name`, `customer_email`, `customer_phone`, `status`, `assigned_agent_id`, `created_at`, `updated_at`).
10. **Message**: Conversation turns (`id`, `conversation_id`, `sender_type`, `sender_id`, `content`, `sources`, `created_at`).
11. **Lead**: Captured customer leads (`id`, `tenant_id`, `bot_id`, `conversation_id`, `name`, `email`, `phone`, `source`, `created_at`).
12. **UnansweredQuestion**: Questions with low confidence fallback (`id`, `tenant_id`, `bot_id`, `conversation_id`, `question`, `frequency`, `status`, `created_at`).
13. **Channel**: Integrated touchpoints (`id`, `tenant_id`, `type`, `config`, `is_active`).
14. **WhatsAppIntegration**: Meta Cloud API configuration (`id`, `tenant_id`, `bot_id`, `phone_number_id`, `waba_id`, `encrypted_access_token`, `verify_token`, `is_active`).
15. **Plan**: SaaS pricing tiers (`id`, `name`, `max_bots`, `max_messages_per_month`, `whatsapp_allowed`, `price_cents`).
16. **Subscription**: Active billing plan (`id`, `tenant_id`, `plan_id`, `status`, `current_period_start`, `current_period_end`).
17. **UsageRecord**: Monthly usage metrics (`id`, `tenant_id`, `month_year`, `messages_count`, `ai_tokens_count`, `estimated_cost_cents`).
18. **ApiKey**: Public & Private API tokens (`id`, `tenant_id`, `name`, `key_hash`, `prefix`, `last_used_at`).
19. **AuditLog**: Platform security audit trail (`id`, `tenant_id`, `user_id`, `action`, `resource`, `details`, `ip_address`, `created_at`).
20. **OrderIntegration**: Controlled business order status lookup API (`id`, `tenant_id`, `endpoint_url`, `encrypted_auth_header`, `is_active`).
21. **ConversationFeedback**: Customer rating (`id`, `conversation_id`, `rating`, `comment`, `created_at`).
