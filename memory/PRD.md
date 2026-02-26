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
- **Mark All Fees as Paid**: One-click button to mark all transaction fees as paid for a user
- Granular display controls per user (freeze alerts, fee alerts)
- KYC queue management (approve/reject) with downloadable Cloudinary-hosted documents
- User state management (freeze type, KYC status, password reset)
- Sidebar badges: live counts for new Users, KYC submissions, Transactions (persisted in DB)

### User Wallet Dashboard
- Portfolio overview with Total and Available balance
- USDC and EUR asset cards with locked balance indicators
- Action buttons: Swap, Send, Deposit, Withdraw (with eligibility checks)
- **Fix Now button**: Sends detailed regulatory fee resolution email to user
- Real-time updates via SSE
- Notification bell with unread count and dropdown
- Outstanding fees alert with View Fees + Fix Now buttons
- Account freeze/reactivation flow, KYC flow, password reset flow

### Fee Resolution Email
- Detailed regulatory explanation citing AMLD 6, MiCA, FATF Recommendation 15, FCA Consumer Duty
- Explains why fees cannot be deducted from frozen balance
- Provides wallet address and step-by-step payment instructions
- Professional compliance & finance team branding

### Business Logic
- Available balance = Total - amounts from unpaid-fee transactions
- EUR withdrawal blocked until all unpaid fees are cleared
- Swap (USDC<>EUR) on full balance, 0.2% commission
- Send restricted to wallet-to-wallet USDC (available balance only)

### KYC Document Storage (Cloudinary)
- User KYC images uploaded to Cloudinary on submission
- Admin can view (zoom lightbox) and download (JPG) each document

## Completed Features (Feb 2026)
- [x] Send, Swap, Withdraw flows
- [x] Real-time SSE updates
- [x] Currency migration USD to EUR
- [x] Admin sidebar badges (persisted)
- [x] Cloudinary KYC document storage with download + zoom
- [x] Fix Now button + detailed regulatory fee resolution email
- [x] Admin "Mark All Fees as Paid" for individual users
- [x] Login page no longer reloads on wrong password

## 3rd Party Integrations
- **Resend:** Transactional emails (RESEND_API_KEY)
- **Cloudinary:** KYC document storage (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)

## Key API Endpoints
- POST /api/wallet/request-fee-resolution — Send regulatory fee resolution email
- POST /api/admin/users/{user_id}/mark-all-fees-paid — Mark all fees as paid
- POST /api/kyc/submit — Upload KYC docs to Cloudinary
- GET /api/admin/badges — Unread badge counts for admin sidebar
- PUT /api/admin/badges/{section}/mark-read — Persist mark-as-read

## P2 Backlog
- Refactor server.py into FastAPI routers
- PWA enhancements
- Admin audit trail/event timeline
- Transaction filtering/sorting on user side

## DB Collections
- users, wallets, transactions, kyc_documents, notifications, email_logs, audit_logs, sessions, system_settings, admin_section_seen
