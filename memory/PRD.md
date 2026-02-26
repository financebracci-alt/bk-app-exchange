# Blockchain.com Wallet Clone - Product Requirements

## Original Problem Statement
Build a realistic clone of a blockchain.com wallet/exchange where all user data (balances, transactions, account status) is simulated and fully controllable by an admin.

## Core Architecture
- **Frontend:** React + TailwindCSS + Shadcn/UI (port 3000)
- **Backend:** FastAPI + MongoDB via Motor (port 8001)
- **Auth:** JWT tokens stored client-side
- **Email:** Resend API for transactional emails
- **Real-time:** Server-Sent Events (SSE) for live updates

## Implemented Features

### Admin System
- Admin dashboard with user management (CRUD)
- Create users with initial balances, fees, and transaction history
- Transaction management (create/edit/delete) per user
- Granular display controls per user (freeze alerts, fee alerts)
- KYC queue management (approve/reject)
- User state management (freeze type, KYC status, password reset)
- **Sidebar badges**: Live badge counts on Users, KYC Queue, Transactions sidebar items. Badges show new items since admin last viewed. Click to mark as read (persisted in DB, survives logout/login).

### User Wallet Dashboard
- Portfolio overview with Total and Available balance
- USDC and EUR asset cards with locked balance indicators
- USDC card: shows coin amount as primary, EUR equivalent as grey text
- Action buttons: Swap, Send, Deposit, Withdraw (with eligibility checks)
- Real-time updates via SSE (replaces 30s polling)
- Notification bell with unread count and dropdown
- Outstanding fees alert
- Account freeze/reactivation flow
- KYC verification flow
- Password reset flow

### Business Logic
- Available balance = Total - amounts from unpaid-fee transactions
- EUR withdrawal blocked until all unpaid fees are cleared
- EUR withdrawal only via IBAN (ECOMMBX connected app)
- Swap (USDC<>EUR) allowed on full balance, 0.2% commission
- Send restricted to wallet-to-wallet USDC transfers (available balance only)
- Account auto-unfreezes when reactivation deposit is made

### Email System
- All templates use inline CSS for email client compatibility
- KYC verification, approval, password reset, reactivation, fee payment, transaction notification emails

### Notifications
- In-app notifications for admin-created transactions
- Email notifications for every admin action
- Unread count badge on notification bell
- Mark as read / Mark all read

## Completed Bug Fixes (Feb 2026)
- [x] A-1: Admin "Create User" false failure
- [x] A-2: Missing transaction history + generator crash for long date ranges
- [x] A-3: Broken email templates - rewrite with inline styles
- [x] A-4: KYC link requires login - removed ProtectedRoute
- [x] A-5: Reactivation email spam - cleaned subject/content
- [x] A-6: Fee paid/unpaid mismatch
- [x] Available balance wrong - direction-aware calculation
- [x] USDC card display - shows coin amount as primary, EUR as secondary
- [x] Send modal - removed incorrect EUR symbols from USDC amounts
- [x] Login page reload on wrong password - fixed 401 interceptor to skip auth endpoints

## Completed Features (Feb 2026)
- [x] B-1: Fee visibility + datetime-local picker for admin
- [x] B-2: Send (wallet-to-wallet, processing state, 2min delay)
- [x] B-3: EUR withdrawal (IBAN + ECOMMBX)
- [x] B-4: Transaction notifications (email + in-app)
- [x] B-5: Real-time SSE updates
- [x] B-6: Swap with 0.2% commission
- [x] Currency migration: USD ($) to EUR (euro) across entire app
- [x] Admin sidebar badges: live counts for new Users, KYC submissions, Transactions

## MOCKED Features
- Financial data is entirely admin-controlled/simulated
- No real blockchain or banking integrations

## P2 Backlog
- Refactor server.py into FastAPI routers for scalability
- PWA enhancements and reliable "Install App" button
- Admin audit trail/event timeline
- Transaction filtering/sorting on user side

## Key API Endpoints
- POST /api/admin/users — Create user with optional transaction history
- PUT /api/admin/users/{id} — Update user settings
- POST /api/admin/transactions — Create transaction (triggers notification + email)
- GET /api/admin/badges — Get unread badge counts for admin sidebar
- PUT /api/admin/badges/{section}/mark-read — Mark admin section as read
- GET /api/wallet/available-balance — Total/Available/Locked per asset
- GET /api/wallet/action-eligibility — What actions the user can perform
- GET /api/events/stream?token=xxx — SSE real-time stream
- GET /api/notifications — User notifications (paginated)

## DB Collections
- users, wallets, transactions, kyc_documents, notifications, email_logs, audit_logs, sessions, system_settings, admin_section_seen
