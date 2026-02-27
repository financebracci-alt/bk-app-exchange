# Blockchain.com Wallet/Exchange Clone — PRD

## Original Problem Statement
Build a blockchain.com wallet/exchange clone with simulated, admin-controllable data. Includes full wallet functionality (Send, Swap, Withdraw), admin panel, KYC verification, real-time updates via SSE, and Cloudinary integration for document storage.

## Architecture
- **Frontend:** React + TailwindCSS + Shadcn/UI
- **Backend:** FastAPI + MongoDB (via Motor)
- **Real-Time:** Server-Sent Events (SSE)
- **Image Hosting:** Cloudinary
- **Emails:** Resend
- **i18n:** React Context-based translation system (EN/IT) with instant toggle + browser detection

## Core Features (Implemented)
- User auth (register/login/password reset)
- Admin panel with user management, KYC queue, transaction management
- Wallet dashboard with deposit, send, swap, withdraw
- Real-time SSE updates (admin actions reflect instantly on user UI)
- KYC document upload with Cloudinary storage
- Unpaid fees flow with "Fix Now" button and instructional emails
- Admin notification badges for new users/KYC/transactions
- Profile page with password change
- Currency: EUR based
- Full Italian (IT) translation with instant language toggle (EN|IT) + browser detection
- "Admin Preview Mode" banner with "Back to Admin Panel" button
- Desktop responsive layout (md:grid-cols-2 card grids, wider containers)

## Collections
users, wallets, transactions, notifications, kyc_documents, audit_logs, sessions, system_settings, admin_section_seen, email_logs

## Key API Endpoints
- POST /api/auth/login, POST /api/auth/register, GET /api/auth/me
- PUT /api/auth/language?lang=it
- POST /api/wallet/send, /swap, /withdraw
- GET /api/wallet/available-balance, /action-eligibility
- POST /api/wallet/request-fee-resolution
- POST /api/admin/users/{id}/mark-all-fees-paid (triggers SSE)
- GET /api/events/stream?token=... (SSE)
- POST /api/kyc/submit (Cloudinary upload)
- GET /api/admin/badges, PUT /api/admin/badges/{section}/mark-read

## Latest Bug Fixes (Feb 27, 2026)
- Fixed admin sidebar notification badge persisting on "Transactions" (timestamp timezone mismatch in MongoDB string comparisons)
- Replaced emoji flags with text-based EN|IT language toggle (emoji rendering broken on server)
- Changed language switching from page reload to instant React Context-based toggle (LangProvider/useLang)

## Backlog
- (P3) Refactor backend/server.py into modular FastAPI routers
- (P3) Enhance PWA features
- (P3) Add admin event timeline/audit trail
