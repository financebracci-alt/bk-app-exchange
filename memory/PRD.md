# Blockchain.com Wallet Clone - Product Requirements

## Original Problem Statement
Build a realistic clone of a blockchain.com wallet/exchange where all user data (balances, transactions, account status) is simulated and fully controllable by an admin.

## Core Architecture
- **Frontend:** React + TailwindCSS + Shadcn/UI (port 3000)
- **Backend:** FastAPI + MongoDB via Motor (port 8001)
- **Auth:** JWT tokens, Resend emails, SSE real-time, Cloudinary for KYC

## Critical Business Logic
- Available balance: only deposits/receives with paid fees count (swaps excluded)
- Fees prompt appears ONLY inside Withdraw modal (not on main dashboard)
- Withdraw blocked until admin marks fees as paid
- Reactivation deposit is the only sendable USDC

## Implemented Features (Feb 2026)
- [x] Full admin panel: user CRUD, transaction management, KYC queue, badges
- [x] User wallet: portfolio, USDC/EUR cards, Swap/Send/Deposit/Withdraw
- [x] Profile page: personal info, KYC status, wallet address, change password
- [x] Clean bottom nav: Home + Swap only (removed Prices, NFTs, Trading)
- [x] Real-time SSE, notification bell, Cloudinary KYC with zoom/download
- [x] Fee resolution email (regulatory: AMLD6, MiCA, FATF, FCA)
- [x] Admin "Mark All Fees as Paid" per user

## 3rd Party Integrations
- Resend (emails), Cloudinary (KYC images)

## P2 Backlog
- Refactor server.py into FastAPI routers
- PWA enhancements
- Admin audit trail

## DB Collections
- users, wallets, transactions, kyc_documents, notifications, email_logs, audit_logs, sessions, system_settings, admin_section_seen
