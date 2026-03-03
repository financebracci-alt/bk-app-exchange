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
- Full EN/IT translation across all pages and backend
- All 8+ email types have Italian templates
- **Automatic transaction emails**: Swap, Send, Withdraw actions trigger email notifications to users with transaction details and status (Processing/Completed)
- **Status badges in emails**: Color-coded (green=completed, yellow=processing, red=failed)
- **Auto-complete emails**: When send/withdraw transactions auto-complete after 2 minutes, a second "Completed" email is sent
- Language toggle (EN|IT) on ALL user pages including Register and Reset Password
- Backend language sync on toggle
- Bilingual backend error messages and eligibility reasons
- KYC submission timestamps shown in admin panel

## Collections
users, wallets, transactions, notifications, kyc_documents, audit_logs, sessions, system_settings, admin_section_seen, email_logs

## Recent Changes
- (2026-03-03) Updated KYC processing time text from "1-2 business days" to "five minutes to 24 hours" in both EN and IT translations
- (2026-03-03) Added User name/email and Time columns to the admin Transactions table (backend enriches transactions with user lookup)
- (2026-03-03) Added plain text password visibility and editing for admin: Password field on Edit User page with show/hide toggle. Plain passwords stored on registration, password change, and password reset. Admin can view and change any user's password.

## Backlog
- (P3) Refactor backend/server.py into modular FastAPI routers
- (P3) Enhance PWA features
- (P3) Add admin event timeline/audit trail
