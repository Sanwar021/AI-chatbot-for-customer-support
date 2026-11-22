import asyncio
import json
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.ai.factory import get_ai_provider
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.bot import Bot, BotSettings
from app.models.conversation import Conversation, ConversationStatus, Message, MessageSenderType
from app.models.knowledge import Document, DocumentChunk, DocumentStatus, FAQ
from app.models.lead import Lead
from app.models.tenant import Plan, Subscription, Tenant
from app.models.unanswered import UnansweredQuestion, UnansweredStatus
from app.models.usage import UsageRecord
from app.models.user import User, UserRole

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEMO_CLINIC_OVERVIEW = """
Welcome to Demo Dental Clinic - Advanced Oral Healthcare.
We are located at 45 Park Avenue, Medical District, Suite 400.
Phone: +1 (555) 321-4321 | Email: care@demodental.com

CLINIC OPENING HOURS:
- Monday to Friday: 9:00 AM - 7:00 PM
- Saturday: 10:00 AM - 4:00 PM
- Sunday: Closed (Emergency on-call available)

CLINIC SERVICES & PROCEDURES:
1. Routine Cleaning & Scaling: Comprehensive ultrasonic cleaning, plaque removal, and fluoride polish.
2. Professional Teeth Whitening: Laser-assisted in-office bleaching producing up to 6 shades whiter teeth in 60 minutes.
3. Dental Implants & Crowns: High-precision titanium dental implants and custom porcelain crowns with 10-year durability.
4. Invisible Orthodontics: Clear aligners for gentle teeth straightening without metal wires.
5. Pediatric Dental Care: Child-friendly gentle dental checkups, sealants, and cavity fillings.
6. Emergency Toothache Relief: Same-day appointments for acute dental pain, chipped teeth, and extractions.

APPOINTMENT & BOOKING POLICY:
- Patients can book appointments online through our website or by calling our hotline.
- Please arrive 10 minutes prior to scheduled appointment for paperwork.
- Cancellations must be made at least 24 hours in advance to avoid a rescheduling fee.
- We accept major dental insurance providers, credit cards, debit cards, and contactless payments.

DEMO PRICING (EXEMPLARY ESTIMATES FOR DEMO PURPOSES ONLY):
- Routine Dental Checkup & Cleaning: $85 (Demo rate)
- Professional Teeth Whitening Session: $250 (Demo rate)
- Dental Crown Installation: $650 per tooth (Demo rate)
- Emergency Consultation: $75 (Demo rate)

BENGALI SERVICE SUMMARY (বাংলা বিবরণ):
ডেমো ডেন্টাল ক্লিনিকে আপনাকে স্বাগতম। আমাদের ক্লিনিকে অভিজ্ঞ ডেন্টাল সার্জন দ্বারা দাঁতের সকল ধরনের আধুনিক চিকিৎসা প্রদান করা হয়।
আমাদের সেবা সমূহ:
- দাঁত স্কেলিং ও পলিশিং
- লেজার টিথ হোয়াইটনিং (দাঁত সাদা করা)
- রুট ক্যানেল ও ফিলিং
- ডেন্টাল ইমপ্ল্যান্ট ও ক্রাউন
- শিশুদের দাঁতের যত্ন

সময়সূচি: সোমবার থেকে শুক্রবার সকাল ৯টা থেকে সন্ধ্যা ৭টা, শনিবার সকাল ১০টা থেকে বিকাল ৪টা, রবিবার সাপ্তাহিক বন্ধ।
"""

DEMO_FAQS = [
    {
        "q": "What are your clinic opening hours?",
        "a": "Our clinic is open Monday through Friday from 9:00 AM to 7:00 PM, and Saturday from 10:00 AM to 4:00 PM. We are closed on Sunday, but our emergency line remains active.",
        "cat": "Hours & Location",
    },
    {
        "q": "আপনার ক্লিনিকের সময়সূচি কি?",
        "a": "আমাদের ক্লিনিক সোমবার থেকে শুক্রবার সকাল ৯টা থেকে সন্ধ্যা ৭টা এবং শনিবার সকাল ১০টা থেকে বিকাল ৪টা পর্যন্ত খোলা থাকে। রবিবার নিয়মিত চিকিৎসা বন্ধ থাকে।",
        "cat": "Hours & Location",
    },
    {
        "q": "How can I book an appointment?",
        "a": "You can book an appointment directly through our online website widget, or by calling our desk at +1 (555) 321-4321. Please arrive 10 minutes before your scheduled slot.",
        "cat": "Appointments",
    },
    {
        "q": "কীভাবে ডেন্টাল অ্যাপয়েন্টমেন্ট বুক করব?",
        "a": "আপনি আমাদের ওয়েবসাইটের চ্যাটবট বা হেল্পলাইনে কল করে সহজেই অ্যাপয়েন্টমেন্ট বুক করতে পারেন। দয়া করে নির্দিষ্ট সময়ের ১০ মিনিট পূর্বে উপস্থিত থাকুন।",
        "cat": "Appointments",
    },
    {
        "q": "Do you handle dental emergencies?",
        "a": "Yes! We provide same-day urgent care for severe toothaches, broken teeth, knocked-out teeth, and abscesses. Contact our emergency line immediately.",
        "cat": "Emergency",
    },
    {
        "q": "How much does a routine dental cleaning cost?",
        "a": "Our standard routine dental checkup and scaling session is $85 (Demo rate). Final fees may vary based on individual periodontal health assessment.",
        "cat": "Pricing",
    },
]

async def seed_database():
    """Seed complete production-ready multi-tenant demo environment."""
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        # 1. Seed Plans
        plans_data = [
            ("Basic", 1, 1000, False, 1900),
            ("Pro", 3, 10000, True, 4900),
            ("Business", 999, 50000, True, 14900),
        ]
        plans = {}
        for name, max_b, max_m, wa, price in plans_data:
            p = db.query(Plan).filter(Plan.name == name).first()
            if not p:
                p = Plan(name=name, max_bots=max_b, max_messages_per_month=max_m, whatsapp_allowed=wa, price_cents=price)
                db.add(p)
                db.flush()
            plans[name] = p

        # 2. Seed Super Admin
        super_admin = db.query(User).filter(User.role == UserRole.SUPERADMIN).first()
        if not super_admin:
            # Create master platform tenant for superadmin
            platform_tenant = Tenant(name="SupportPilot Platform HQ", slug="supportpilot-hq", plan_id=plans["Business"].id)
            db.add(platform_tenant)
            db.flush()

            super_admin = User(
                tenant_id=platform_tenant.id,
                email="superadmin@supportpilot.ai",
                hashed_password=hash_password("adminpassword123"),
                full_name="Platform Super Administrator",
                role=UserRole.SUPERADMIN,
                is_active=True,
                is_verified=True,
            )
            db.add(super_admin)
            logger.info("Created Super Admin user: superadmin@supportpilot.ai / adminpassword123")

        # 3. Seed Demo Tenant: "Demo Dental Clinic"
        demo_tenant = db.query(Tenant).filter(Tenant.slug == "demo-dental-clinic").first()
        if not demo_tenant:
            demo_tenant = Tenant(
                name="Demo Dental Clinic",
                slug="demo-dental-clinic",
                plan_id=plans["Pro"].id,
                is_active=True,
            )
            db.add(demo_tenant)
            db.flush()

            demo_sub = Subscription(
                tenant_id=demo_tenant.id,
                plan_id=plans["Pro"].id,
                status="active",
            )
            db.add(demo_sub)
            logger.info("Created Demo Tenant: Demo Dental Clinic")

        # 4. Seed Demo Owner User
        demo_user = db.query(User).filter(User.email == "demo@supportpilot.ai").first()
        if not demo_user:
            demo_user = User(
                tenant_id=demo_tenant.id,
                email="demo@supportpilot.ai",
                hashed_password=hash_password("password123"),
                full_name="Dr. Sarah Jenkins (Demo Owner)",
                role=UserRole.OWNER,
                is_active=True,
                is_verified=True,
            )
            db.add(demo_user)
            logger.info("Created Demo Owner: demo@supportpilot.ai / password123 (or Passkey: 3400)")

        # 5. Seed Demo Bot
        demo_bot = db.query(Bot).filter(Bot.tenant_id == demo_tenant.id).first()
        if not demo_bot:
            demo_bot = Bot(
                tenant_id=demo_tenant.id,
                name="DentalCare AI Assistant",
                public_key="sp_bot_demo_dental_clinic_2026",
                language="multi",
                is_active=True,
            )
            db.add(demo_bot)
            db.flush()

            bot_settings = BotSettings(
                bot_id=demo_bot.id,
                system_prompt="You are the official patient concierge for Demo Dental Clinic. Provide accurate answers based strictly on clinic services, procedures, opening hours, and policies.",
                welcome_message="Welcome to Demo Dental Clinic! How can I assist you with your appointment or oral care today? | ডেমো ডেন্টাল ক্লিনিকে স্বাগতম! আমি কীভাবে আপনাকে সাহায্য করতে পারি?",
                fallback_message="I apologize, but I do not have that specific information in our approved clinic records. Would you like me to connect you with our receptionist? | দুঃখিত, এই তথ্যটি আমাদের নলেজ বেসে নেই। আপনি কি আমাদের প্রতিনিধির সাথে কথা বলতে চান?",
                primary_color="#087b6d",
                position="bottom-right",
                suggested_questions=json.dumps([
                    "What are your opening hours?",
                    "How much is teeth whitening?",
                    "Do you handle dental emergencies?",
                    "কীভাবে অ্যাপয়েন্টমেন্ট বুক করব?",
                ]),
                pre_chat_form_enabled=True,
                allowed_domains="*",
                confidence_threshold="0.55",
            )
            db.add(bot_settings)
            logger.info(f"Created Demo Bot: {demo_bot.name} with key: {demo_bot.public_key}")

        # 6. Seed Demo Knowledge Document & Chunks
        ai_provider = get_ai_provider()
        doc = db.query(Document).filter(Document.tenant_id == demo_tenant.id).first()
        if not doc:
            doc = Document(
                tenant_id=demo_tenant.id,
                bot_id=demo_bot.id,
                name="Dental_Clinic_Services_and_Policies_Guide.txt",
                file_type="txt",
                file_size=len(DEMO_CLINIC_OVERVIEW),
                status=DocumentStatus.READY,
                chunks_count=4,
            )
            db.add(doc)
            db.flush()

            # Split into chunks and generate real/mock embeddings
            paragraphs = [p.strip() for p in DEMO_CLINIC_OVERVIEW.split("\n\n") if p.strip()]
            embeddings = await ai_provider.embed(paragraphs)

            for idx, (p, emb) in enumerate(zip(paragraphs, embeddings)):
                chunk = DocumentChunk(
                    document_id=doc.id,
                    tenant_id=demo_tenant.id,
                    bot_id=demo_bot.id,
                    content=p,
                    chunk_index=idx,
                    embedding=json.dumps(emb),
                    chunk_metadata=json.dumps({"source": doc.name, "section": idx + 1}),
                )
                db.add(chunk)
            logger.info(f"Seeded knowledge base document with {len(paragraphs)} vector chunks.")

        # 7. Seed Demo FAQs
        existing_faqs = db.query(FAQ).filter(FAQ.tenant_id == demo_tenant.id).count()
        if existing_faqs == 0:
            faq_texts = [f["q"] + " " + f["a"] for f in DEMO_FAQS]
            faq_embeddings = await ai_provider.embed(faq_texts)

            for f_data, emb in zip(DEMO_FAQS, faq_embeddings):
                faq = FAQ(
                    tenant_id=demo_tenant.id,
                    bot_id=demo_bot.id,
                    question=f_data["q"],
                    answer=f_data["a"],
                    category=f_data["cat"],
                    embedding=json.dumps(emb),
                    is_active=True,
                )
                db.add(faq)
            logger.info(f"Seeded {len(DEMO_FAQS)} categorized FAQs.")

        # 8. Seed Demo Conversation & Messages
        conv = db.query(Conversation).filter(Conversation.tenant_id == demo_tenant.id).first()
        if not conv:
            conv = Conversation(
                tenant_id=demo_tenant.id,
                bot_id=demo_bot.id,
                channel="website",
                customer_id="cust_demo_772",
                customer_name="Michael Scott",
                customer_email="michael@dundermifflin.com",
                customer_phone="+1 555-0199",
                status=ConversationStatus.BOT_ACTIVE,
            )
            db.add(conv)
            db.flush()

            m1 = Message(
                conversation_id=conv.id,
                sender_type=MessageSenderType.CUSTOMER,
                content="Hi, what are your opening hours on Saturday?",
            )
            m2 = Message(
                conversation_id=conv.id,
                sender_type=MessageSenderType.BOT,
                content="On Saturday, Demo Dental Clinic is open from 10:00 AM to 4:00 PM. Our clinic is closed on Sunday.",
                sources=json.dumps([{"source": "Dental_Clinic_Services_and_Policies_Guide.txt", "score": 0.89}]),
            )
            db.add_all([m1, m2])

            # Seed a waiting handoff conversation
            conv_handoff = Conversation(
                tenant_id=demo_tenant.id,
                bot_id=demo_bot.id,
                channel="website",
                customer_id="cust_demo_883",
                customer_name="Pam Beesly",
                customer_email="pam@artstudio.com",
                customer_phone="+1 555-0144",
                status=ConversationStatus.WAITING_AGENT,
            )
            db.add(conv_handoff)
            db.flush()

            hm1 = Message(
                conversation_id=conv_handoff.id,
                sender_type=MessageSenderType.CUSTOMER,
                content="I have a severe toothache that started an hour ago. Can I speak to a doctor or nurse right now?",
            )
            hm2 = Message(
                conversation_id=conv_handoff.id,
                sender_type=MessageSenderType.SYSTEM,
                content="Human handoff requested: Customer reported acute toothache.",
            )
            db.add_all([hm1, hm2])

        # 9. Seed Demo Leads
        lead_count = db.query(Lead).filter(Lead.tenant_id == demo_tenant.id).count()
        if lead_count == 0:
            l1 = Lead(
                tenant_id=demo_tenant.id,
                bot_id=demo_bot.id,
                name="Michael Scott",
                email="michael@dundermifflin.com",
                phone="+1 555-0199",
                source="pre_chat_form",
                notes="Inquired about routine scaling and Saturday hours.",
            )
            l2 = Lead(
                tenant_id=demo_tenant.id,
                bot_id=demo_bot.id,
                name="Pam Beesly",
                email="pam@artstudio.com",
                phone="+1 555-0144",
                source="pre_chat_form",
                notes="Emergency toothache consultation.",
            )
            l3 = Lead(
                tenant_id=demo_tenant.id,
                bot_id=demo_bot.id,
                name="Jim Halpert",
                email="jim@halpert.com",
                phone="+1 555-0188",
                source="website_widget",
                notes="Interested in laser teeth whitening pricing.",
            )
            db.add_all([l1, l2, l3])

        # 10. Seed Demo Unanswered Question
        unanswered_count = db.query(UnansweredQuestion).filter(UnansweredQuestion.tenant_id == demo_tenant.id).count()
        if unanswered_count == 0:
            uq1 = UnansweredQuestion(
                tenant_id=demo_tenant.id,
                bot_id=demo_bot.id,
                question="Do you validate parking at the Medical District garage?",
                frequency=3,
                status=UnansweredStatus.UNREVIEWED,
            )
            uq2 = UnansweredQuestion(
                tenant_id=demo_tenant.id,
                bot_id=demo_bot.id,
                question="Can I pay using cryptocurrency like Bitcoin or Ethereum?",
                frequency=1,
                status=UnansweredStatus.UNREVIEWED,
            )
            db.add_all([uq1, uq2])

        # 11. Seed Usage Record
        month_key = datetime.now(timezone.utc).strftime("%Y-%m")
        usage = db.query(UsageRecord).filter(UsageRecord.tenant_id == demo_tenant.id, UsageRecord.month_year == month_key).first()
        if not usage:
            usage = UsageRecord(
                tenant_id=demo_tenant.id,
                month_year=month_key,
                messages_count=142,
                ai_tokens_count=38500,
                estimated_cost_cents=385,
            )
            db.add(usage)

        db.commit()
        logger.info("Demo database environment successfully initialized and seeded.")
    except Exception as e:
        db.rollback()
        logger.exception(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
