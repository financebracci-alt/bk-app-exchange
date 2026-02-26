# Blockchain.com Wallet Clone - Product Requirements

## Original Problem Statement
Build a realistic clone of a blockchain.com wallet/exchange where all user data (balances, transactions, account status) is simulated and fully controllable by an admin.

## Core Architecture
- **Frontend:** React + TailwindCSS + Shadcn/UI (port 3000)
- **Backend:** FastAPI + MongoDB via Motor (port 8001)
- **Auth:** JWT tokens stored client-side
- **Email:** Resend API for transactional emails
- **Real-time:** Server-Sent Events (SSE) for live updates
- **File Storage:** Cloudinary for KYC document images

## Implemented Features

### Admin System
- Admin dashboard with user management (CRUD)
- Create users with initial balances, fees, and transaction history
- Transaction management (create/edit/delete) per user
- Granular display controls per user (freeze alerts, fee alerts)
- KYC queue management (approve/reject) with downloadable documents
- User state management (freeze type, KYC status, password reset)
- Sidebar badges: live counts for new Users, KYC submissions, Transactions (persisted in DB)

### User Wallet Dashboard
- Portfolio overview with Total and Available balance
- USDC and EUR asset cards with locked balance indicators
- Action buttons: Swap, Send, Deposit, Withdraw (with eligibility checks)
- Real-time updates via SSE
- Notification bell with unread count and dropdown
- Outstanding fees alert, freeze/reactivation flow, KYC flow, password reset flow

### Business Logic
- Available balance = Total - amounts from unpaid-fee transactions
- EUR withdrawal blocked until all unpaid fees are cleared
- Swap (USDC<>EUR) on full balance, 0.2% commission
- Send restricted to wallet-to-wallet USDC (available balance only)

### KYC Document Storage (Cloudinary)
- User KYC images uploaded to Cloudinary on submission
- Stored as secure URLs (not base64) in MongoDB
- Admin can view and download each document from KYC review modal
- Backward compatible with older base64 submissions

### Email System
- Inline CSS templates for email client compatibility
- KYC, approval, password reset, reactivation, fee, transaction notification emails

## Completed Bug Fixes (Feb 2026)
- [x] Login page reload on wrong password - fixed 401 interceptor
- [x] USDC card display, Send modal EUR symbols
- [x] All previous A-series bug fixes

## Completed Features (Feb 2026)
- [x] Send, Swap, Withdraw flows
- [x] Real-time SSE updates
- [x] Currency migration USD to EUR
- [x] Admin sidebar badges (persisted)
- [x] Cloudinary KYC document storage with downloadable images

## 3rd Party Integrations
- **Resend:** Transactional emails (RESEND_API_KEY)
- **Cloudinary:** KYC document image storage (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)

## P2 Backlog
- Refactor server.py into FastAPI routers
- PWA enhancements
- Admin audit trail/event timeline
- Transaction filtering/sorting on user side

## Key API Endpoints
- POST /api/kyc/submit — Upload KYC docs to Cloudinary + store in DB
- GET /api/admin/kyc-queue — List KYC submissions with Cloudinary URLs
- GET /api/admin/badges — Unread badge counts for admin sidebar
- PUT /api/admin/badges/{section}/mark-read — Persist mark-as-read

## DB Collections
- users, wallets, transactions, kyc_documents, notifications, email_logs, audit_logs, sessions, system_settings, admin_section_seen
