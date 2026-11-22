# SupportPilot: Production-Ready Multi-Tenant AI Customer Support SaaS

## System Architecture & Technical Specification

### 1. Architectural Overview

SupportPilot is designed with strict multi-tenant isolation, enterprise-grade AI retrieval-augmented generation (RAG), and dual-channel customer engagement (Website Chat Widget & WhatsApp Business Cloud API).

```mermaid
flowchart TD
    subgraph Clients["Customer & Admin Touchpoints"]
        WebWidget["Standalone Chat Widget (Shadow DOM)"]
        WhatsApp["Meta WhatsApp Cloud API (Webhook)"]
        Dashboard["SupportPilot Admin Dashboard (Cyber-Luxe UI)"]
        DemoPage["Demo Dental Clinic Website"]
    end

    subgraph Gateway["API Gateway / Reverse Proxy"]
        Nginx["Nginx Reverse Proxy & SSL Termination"]
        FastAPI["FastAPI 0.115+ REST & WebSocket API"]
    end

    subgraph Security["Security & Tenant Isolation Layer"]
        TenantAuth["Tenant-Scoped Auth & RBAC"]
        TokenGen["JWT Access & Refresh Token Service"]
        SSRFShield["SSRF Validation & Safe Fetcher"]
    end

    subgraph CoreServices["Backend Application Core"]
        ChatEngine["RAG AI Engine (Grounding & Citations)"]
        LiveInbox["Live Inbox & Human Handoff (WebSockets)"]
        DocService["Document Ingestion & Text Extraction"]
        CrawlerService["Safe Website Crawler"]
        LeadService["Lead Capture & Tracking"]
        OrderService["Order Status Lookup Connector"]
        UsageTracker["Usage & Subscription Limiter"]
    end

    subgraph AIProviders["AI Provider Abstraction"]
        GeminiAPI["Google Gemini 1.5/2.0 API"]
        MockAI["Mock AI Provider (Local Dev & Testing)"]
        Embedder["Embedding Generator (768-dim)"]
    end

    subgraph DataStore["Data & Queue Tier"]
        Postgres["PostgreSQL + pgvector / Vector Index"]
        RedisStore["Redis / Celery Background Queue"]
        LocalQueue["In-Process Async Worker Fallback"]
    end

    WebWidget -->|SSE / REST / WebSocket| FastAPI
    WhatsApp -->|Encrypted Webhook| FastAPI
    Dashboard -->|REST / WebSocket| FastAPI
    DemoPage --> WebWidget

    FastAPI --> Nginx
    FastAPI --> TenantAuth
    TenantAuth --> TokenGen
    FastAPI --> CoreServices

    CoreServices --> AIProviders
    AIProviders --> GeminiAPI
    AIProviders --> MockAI
    AIProviders --> Embedder

    CoreServices --> DataStore
    DocService --> SSRFShield
    CrawlerService --> SSRFShield
```

### 2. Multi-Tenant Isolation Model

Every tenant record in the database is strictly bound to a `tenant_id` foreign key. The backend utilizes FastAPI dependency injection (`get_current_tenant`) to extract the tenant context from the validated JWT token or public bot API key. No query executes across tenant boundaries without explicit Super Admin role verification.

### 3. Visual Identity & Color Grading Specification

In accordance with the MRRAW Bank / Bank Asia ZEN Cyber-Luxe design language:

- **Base Canvas**: Deep Void Black (`#020d0c`) with dual radial ambient light cones (Teal 30% and Amber 16%) over a 120-degree linear dark gradient.
- **Surface Elevation**: Frosted Slate Card Surface (`#07152b` with 90% opacity, `backdrop-blur-2xl`, and `1px solid rgba(255, 255, 255, 0.10)`).
- **Accents**: Primary Teal (`#087b6d` to `#169889`), Cyber Cyan (`#38bdf8`), Flame Orange (`#ff6819`), and Gold (`#f3dc64`).
- **macOS Window Frame**: Desktop workstation viewport with animated pulsing red, amber, and green window dots (`#ff675d`, `#ffbd45`, `#31c94d`).
- **Passkey On-Screen Keypad**: 3x4 tactile PIN grid with default demo passkey `3400`.
