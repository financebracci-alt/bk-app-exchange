# Blockchain.com Wallet/Exchange Clone — PRD

## Original Problem Statement
Build a blockchain.com wallet/exchange clone with simulated, admin-controllable data. Includes full wallet functionality (Send, Swap, Withdraw), admin panel, KYC verification, real-time updates via SSE, and Cloudinary integration for document storage.

## Architecture
- **Frontend:** React + TailwindCSS + Shadcn/UI
- **Backend:** FastAPI + MongoDB (via Motor)
- **Real-Time:** Server-Sent Events (SSE)
- **Image Hosting:** Cloudinary
- **Emails:** Resend
- **i18n:** Custom JS-based translation system (EN/IT)

## Core Features (Implemented)
- User auth (register/login/password reset)
- Admin panel with user management, KYC queue, transaction management
- Wallet dashboard with deposit, send, swap, withdraw
- Real-time SSE updates (admin actions reflect instantly on user UI)
- KYC document upload with Cloudinary storage
- Unpaid fees flow with "Fix Now" button and instructional emails
- Admin notification badges for new users/KYC/transactions
- Profile page with password change
- Currency: EUR (€) based
- Full Italian (IT) translation with browser-based language detection

## Collections
users, wallets, transactions, notifications, kyc_submissions, audit_logs, sessions, system_settings, admin_section_seen

## Key API Endpoints
- `POST /api/auth/login` / `POST /api/auth/register`
- `GET /api/auth/me` — current user + wallets
- `PUT /api/auth/language?lang=it` — set preferred language
- `POST /api/wallet/send` / `POST /api/wallet/swap` / `POST /api/wallet/withdraw`
- `GET /api/wallet/available-balance` / `GET /api/wallet/action-eligibility`
- `POST /api/wallet/request-fee-resolution` — send fee resolution email
- `POST /api/admin/users/{id}/mark-all-fees-paid` — admin marks fees paid (triggers SSE)
- `GET /api/events/stream?token=...` — SSE event stream
- `POST /api/kyc/submit` — submit KYC documents (Cloudinary upload)
- `GET /api/admin/badge-counts` — notification badge counts

## What's Been Implemented (Latest Session — Feb 2026)
- **Desktop Responsive Layout:** All user-facing pages (Dashboard, Profile, Transactions, KYC, Register) now use responsive TailwindCSS (md:max-w-3xl lg:max-w-5xl xl:max-w-6xl) with md:grid-cols-2 card layouts
- **Italian (i18n) Translation:** Complete EN/IT translation system (250+ keys) with browser language detection. All pages use getTranslations() from i18n.js. Backend emails sent in user's preferred language.
- **SSE Instant Updates:** Admin actions (mark fees paid, etc.) trigger real-time SSE events that update user dashboard without refresh
- **Language Preference Sync:** Browser language is automatically sent to backend on login and register

## Backlog
- (P3) Refactor backend/server.py into modular FastAPI routers
- (P3) Enhance PWA features and "Install App" button
- (P3) Add admin event timeline/audit trail

## 3rd Party Integrations
- Resend (emails)
- Cloudinary (KYC image hosting)
