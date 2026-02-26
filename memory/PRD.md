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

## Critical Business Logic

### Available Balance
- **Only deposits and receives with paid fees** count toward available USDC balance
- **Swaps do NOT contribute** to available balance — prevents balance inflation through swap loops
- Available balance = paid-fee inflows (deposit/receive) - outflows (send/withdrawal)

### Fee Resolution Flow
1. User goes through deposit → swap → EUR balance flow
2. When user clicks **Withdraw** with EUR balance and unpaid fees → fees prompt shown INSIDE the modal
3. Prompt includes: View Fees + Fix Now buttons
4. Fix Now sends detailed regulatory email (AMLD 6, MiCA, FATF, FCA)
5. Fees prompt persists until admin marks fees as paid
6. Outstanding fees alert is NOT shown on main dashboard (only in withdraw modal)

### Admin Mark All Fees as Paid
- One-click button in admin user → Transactions tab
- Marks all transaction fees as paid for that user
- Resets total_unpaid_fees to 0.00

## Implemented Features

### Admin System
- Dashboard with user management (CRUD), transaction management, KYC queue
- Mark All Fees as Paid button per user
- Sidebar badges: live counts for new Users, KYC, Transactions (persisted in DB)
- KYC document viewing with zoom lightbox and Cloudinary download

### User Wallet Dashboard
- Portfolio overview with Total and Available balance
- USDC/EUR asset cards, action buttons (Swap, Send, Deposit, Withdraw)
- Real-time SSE updates, notification bell
- Withdraw modal with integrated fees prompt when blocked

## 3rd Party Integrations
- **Resend:** Transactional emails (RESEND_API_KEY)
- **Cloudinary:** KYC document storage (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)

## P2 Backlog
- Refactor server.py into FastAPI routers
- PWA enhancements
- Admin audit trail/event timeline
- Transaction filtering/sorting on user side

## DB Collections
- users, wallets, transactions, kyc_documents, notifications, email_logs, audit_logs, sessions, system_settings, admin_section_seen
