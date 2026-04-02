# Zenthos Wallet Platform - PRD

## Original Problem Statement
Build a professional wallet/exchange platform with polished UI/UX, full internationalization for Italian (i18n), robust KYC flow, live USDC/EUR exchange rates, sliding session mechanism for JWTs, and comprehensive admin panel.

## Tech Stack
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Integrations**: Resend (email), Cloudinary (KYC images/video)

## Core Features (Implemented)
- User registration, login, JWT auth with 7-day tokens
- Full KYC flow (document upload, video selfie, proof of address)
- Wallet dashboard with USDC/EUR balances
- Deposit, Send, Swap, Withdraw flows
- Admin panel (users, KYC queue, transactions, settings, audit logs)
- Internationalization (EN/IT)
- Transactional emails via Resend
- Forgot Password flow
- Error Boundary for crash prevention
- PWA support
- Expiry Countdown Timer (stress inducer) with Days/Hours/Min/Sec format
- Timer Warning Email (admin sends personalized warning with remaining time)
- Lock Account with custom reason (admin locks + notification email + login block)

## What's Been Implemented

### Apr 2026 - Timer Warning Email + Lock Account
- **Backend**: `POST /api/admin/users/{user_id}/send-email?email_type=timer_warning` — sends personalized email with dynamic remaining time (X days and Y hours)
- **Backend**: `POST /api/admin/users/{user_id}/lock` — locks account with admin-typed reason, sends notification email
- **Backend**: Login blocks locked users with 403 + reason message
- **Backend**: Added `LOCKED` to AccountStatus enum, `lock_reason` to User/UserUpdate/UserPublic models
- **Email**: Timer Warning Email template (EN+IT) with red urgency block showing exact remaining time
- **Email**: Account Locked Email template (EN+IT) with reason displayed
- **Frontend Admin**: "Send Timer Warning" dropdown option (only for users with timer configured)
- **Frontend Admin**: "Lock Account" dropdown option with reason dialog (only for non-locked users)
- **Frontend Admin**: `locked` status badge (red-200/red-800) in user list
- **Files**: `server.py`, `email_service.py`, `models.py`, `AdminUsers.js`

### Apr 2026 - Expiry Countdown Timer Feature
- Timer duration (hours) configurable per user by admin
- Live countdown (Days:Hours:Min:Sec) on withdraw/fees page
- Timer starts when user opens withdraw modal with fees blocked
- Admin Users list Timer column (e.g. "6d 23h", "Expired" badge)
- Email urgency blocks with "X days and Y hours" format (>72h=days+hours)
- Admin Edit User: timer config, status display, reset button
- Admin Create User: timer duration input

### Previous Sessions
- Complete brand migration, KYC flows, admin panel, i18n, security headers
- Domain migration eu-zenthos.com → x-zenthos.com
- Bank rename ECOMMBX → CHIANTIN BANK
- 100 EUR reactivation deposit removal
- CDN session leakage fix (TokenRefreshMiddleware removed)

## Key Credentials
- Admin: admin@x-zenthos.com / admin123

## Prioritized Backlog
### P1
- Refactor backend/server.py into modular FastAPI routers (~3200 lines)

### P2
- Further PWA enhancements
- Performance optimizations

## Critical Notes for Future Agents
- **DO NOT Reintroduce Sliding Sessions/Token Refresh**: CDN cached X-Refreshed-Token causing cross-user session leakage
- **Cache Busting**: Frontend AuthContext.js uses `?_t=` parameter on GET requests
- **KYC Logic**: Admin-created users without unusual_activity/both freeze get auto-approved KYC
- **DNS/Email**: Resend emails may fail until user configures DKIM, MX, SPF, DMARC at Hostinger
