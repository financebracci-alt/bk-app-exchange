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
- KYC document upload via Cloudinary (chunked individual uploads)
- Unpaid fees flow with "Fix Now" button + email instructions
- Profile page with full user info
- Desktop responsive layout (md:grid-cols-2, wider containers)
- Full EN/IT translation across all pages and backend
- All 8+ email types have Italian templates
- Automatic transaction emails with status badges
- Language toggle (EN|IT) on ALL user pages
- Backend language sync on toggle
- Bilingual backend error messages
- KYC submission timestamps shown in admin panel
- Live USDC/EUR exchange rate (ECB via Frankfurter API with micro-fluctuations, 60s refresh)
- Sliding session (24h inactivity JWT auto-refresh via X-Refreshed-Token header)
- Admin: plain-text password view/edit, DOB field, registration dates, user/time in transactions
- Email deliverability fixes (anti-spam headers, DMARC guidance)
- Auto-resend emails on admin email change

## Collections
users, wallets, transactions, notifications, kyc_documents, audit_logs, sessions, system_settings, admin_section_seen, email_logs

## Verification Status (2026-03-05)
All 16 critical features verified via comprehensive testing (backend 100%, frontend 100%):
- Landing page, EN/IT toggle, admin login/dashboard/users/edit/transactions
- User registration/login, wallet dashboard with live exchange rate
- Exchange rate API, sliding session, KYC form, profile, transactions page, health check

## Backlog
- (P3) Refactor backend/server.py into modular FastAPI routers
- (P3) Enhance PWA features
- (P3) Add admin event timeline/audit trail
