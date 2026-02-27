# Blockchain.com Wallet/Exchange Clone — PRD

## Original Problem Statement
Build a blockchain.com wallet/exchange clone with simulated, admin-controllable data. Full wallet functionality (Send, Swap, Withdraw), admin panel, KYC verification, real-time SSE updates, Cloudinary for KYC docs, Resend for emails, complete EN/IT translation.

## Architecture
- **Frontend:** React + TailwindCSS + Shadcn/UI
- **Backend:** FastAPI + MongoDB (Motor async)
- **Real-Time:** Server-Sent Events (SSE)
- **Image Hosting:** Cloudinary (KYC documents)
- **Emails:** Resend (all transactional emails)
- **i18n:** React Context-based (LangProvider/useLang), 250+ keys, instant toggle

## Implemented Features
- User auth (register/login/password reset/change password)
- Admin panel: user management, KYC queue, transaction management, notification badges
- Wallet dashboard: deposit, send, swap, withdraw with business logic
- Real-time SSE updates (admin actions instantly reflected on user UI)
- KYC document upload via Cloudinary
- Unpaid fees flow with "Fix Now" button + email instructions
- Profile page with full user info
- Desktop responsive layout (md:grid-cols-2, wider containers)
- Full EN/IT translation: ALL pages (Landing, Login, Register, Dashboard, Transactions, Profile, KYC, Reset Password)
- Transaction types translated (Deposito, Ricezione, Invio, Scambio, Prelievo)
- Italian date formatting with locale-aware dates on Profile and Transactions pages
- Locale-aware number formatting (comma decimal for Italian)
- All 8 email types have Italian templates
- Admin preview banner with "Back to Admin Panel"
- Language toggle (EN|IT) on ALL user pages: Landing, Login, Register, Reset Password, Wallet Dashboard
- Instant language switching via React Context (no page reload)
- Backend language sync: toggleLang syncs to backend via PUT /api/auth/language
- Bilingual backend error messages (HTTPException details) for send/swap/withdraw
- Bilingual backend eligibility reasons (action-eligibility endpoint)
- Bilingual backend notifications (stored in user's preferred_language)
- Translated KYC status display in wallet dashboard (Verificato, In Attesa, etc.)

## Collections
users, wallets, transactions, notifications, kyc_documents, audit_logs, sessions, system_settings, admin_section_seen, email_logs

## Backlog
- (P3) Refactor backend/server.py into modular FastAPI routers
- (P3) Enhance PWA features
- (P3) Add admin event timeline/audit trail
