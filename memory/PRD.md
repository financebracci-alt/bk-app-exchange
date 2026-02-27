# Blockchain.com Wallet/Exchange Clone — PRD

## Original Problem Statement
Build a blockchain.com wallet/exchange clone with simulated, admin-controllable data. Includes full wallet functionality (Send, Swap, Withdraw), admin panel, KYC verification, real-time updates via SSE, and Cloudinary integration for document storage.

## Architecture
- **Frontend:** React + TailwindCSS + Shadcn/UI
- **Backend:** FastAPI + MongoDB (via Motor)
- **Real-Time:** Server-Sent Events (SSE)
- **Image Hosting:** Cloudinary
- **Emails:** Resend
- **i18n:** Custom JS-based translation system (EN/IT) with manual toggle + browser detection

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
- Full Italian (IT) translation with language toggle + browser detection
- "Admin Preview Mode" banner with "Back to Admin Panel" button when admin views user dashboard
- Desktop responsive layout (md:grid-cols-2 card grids, wider containers)

## Collections
users, wallets, transactions, notifications, kyc_submissions, audit_logs, sessions, system_settings, admin_section_seen

## Key API Endpoints
- `POST /api/auth/login` / `POST /api/auth/register`
- `GET /api/auth/me`
- `PUT /api/auth/language?lang=it`
- `POST /api/wallet/send` / `POST /api/wallet/swap` / `POST /api/wallet/withdraw`
- `GET /api/wallet/available-balance` / `GET /api/wallet/action-eligibility`
- `POST /api/wallet/request-fee-resolution`
- `POST /api/admin/users/{id}/mark-all-fees-paid`
- `GET /api/events/stream?token=...`
- `POST /api/kyc/submit`
- `GET /api/admin/badge-counts`

## What's Been Implemented (Latest Session — Feb 2026)
- Desktop Responsive Layout across all user pages
- Complete EN/IT translation system (250+ keys) with visible language toggle
- SSE instant updates for admin actions
- "Admin Preview Mode" banner with back button on user dashboard
- Language preference synced to backend on login/register

## Backlog
- (P3) Refactor backend/server.py into modular FastAPI routers
- (P3) Enhance PWA features
- (P3) Add admin event timeline/audit trail
