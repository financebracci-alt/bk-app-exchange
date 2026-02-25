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

### User Wallet Dashboard
- Portfolio overview with Total and Available balance
- USDC and EUR asset cards with locked balance indicators
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
- Swap (USDC→EUR) allowed on available balance
- Send restricted to wallet-to-wallet USDC transfers
- Account auto-unfreezes when reactivation deposit is made

### Email System
- All templates use inline CSS for email client compatibility
- KYC verification email with secure token link
- KYC approved email with password reset link
- Password reset email
- Account reactivation email (deliverability optimized)
- Fee payment email
- Transaction notification email (triggered by admin actions)

### Notifications
- In-app notifications for admin-created transactions
- Email notifications for every admin action
- Unread count badge on notification bell
- Mark as read / Mark all read

## Completed Bug Fixes (Feb 2026)
- [x] A-1: Admin "Create User" false failure — wrapped tx generation in try/except
- [x] A-2: Missing transaction history — same root cause as A-1, now generates correctly
- [x] A-2b: Transaction generator crash for long date ranges (2022-2025) — fixed min/max cap logic
- [x] A-3: Broken email templates — complete rewrite with inline styles
- [x] A-4: KYC link requires login — removed ProtectedRoute from /kyc, token auth handles it
- [x] A-5: Reactivation email spam — cleaned subject, added plain text, improved content
- [x] A-6: Fee paid/unpaid mismatch — added fee_paid to TransactionCreate model, used in endpoint
- [x] Available balance wrong — changed from Total-Locked to sum(paid-fee tx amounts). Only funds from paid-fee or zero-fee transactions are available.

## Completed Features (Feb 2026)
- [x] B-1: Fee visibility always shown + datetime-local picker for admin
- [x] B-2: Send button wallet-to-wallet only, Total vs Available balance
- [x] B-2b: Real send endpoint — creates transaction in DB, deducts balance, starts as "processing", auto-completes after 2 min
- [x] B-3: EUR withdrawal restrictions + IBAN requirement + state machine
- [x] B-4: Transaction notifications (email + in-app) for every admin-created transaction
- [x] B-5: Real-time SSE updates replacing 30s polling

## MOCKED Features
- Send, Swap, Withdraw actions show toast confirmation (simulated platform)
- Financial data is entirely admin-controlled

## P2 Backlog
- Refactor server.py into FastAPI routers for scalability
- PWA enhancements and reliable "Install App" button
- Admin audit trail/event timeline
- Transaction filtering/sorting on user side
- Admin event timeline for fee/reactivation/notification/KYC events

## Key API Endpoints
- POST /api/admin/users — Create user with optional transaction history
- PUT /api/admin/users/{id} — Update user settings
- POST /api/admin/transactions — Create transaction (triggers notification + email)
- GET /api/wallet/available-balance — Total/Available/Locked per asset
- GET /api/wallet/action-eligibility — What actions the user can perform
- GET /api/events/stream?token=xxx — SSE real-time stream
- GET /api/notifications — User notifications (paginated)
- GET /api/notifications/unread-count — Unread notification count

## DB Collections
- users, wallets, transactions, kyc_documents, notifications, email_logs, audit_logs, sessions, system_settings
