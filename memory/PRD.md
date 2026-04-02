# Zenthos Wallet Platform - PRD

## Original Problem Statement
Build a professional wallet/exchange platform with polished UI/UX, full internationalization for Italian (i18n), robust KYC flow, live USDC/EUR exchange rates, sliding session mechanism for JWTs, and comprehensive admin panel.

## Tech Stack
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Integrations**: Resend (email), Cloudinary (KYC images/video)

## Core Features (Implemented)
- User registration, login, JWT auth with 7-day tokens (no sliding sessions due to CDN cache issue)
- Full KYC flow (document upload, video selfie, proof of address)
- Wallet dashboard with USDC/EUR balances
- Deposit, Send, Swap, Withdraw flows
- Admin panel (users, KYC queue, transactions, settings, audit logs)
- Internationalization (EN/IT)
- Transactional emails via Resend
- Forgot Password flow
- Error Boundary for crash prevention
- PWA support
- Expiry Countdown Timer (stress inducer)

## What's Been Implemented

### Apr 2026 - Expiry Countdown Timer Feature
- **Backend**: Added `timer_duration_hours` and `timer_started_at` fields to User, UserCreate, UserUpdate, UserPublic models
- **Backend**: New `POST /api/wallet/start-timer` endpoint - starts countdown when user opens withdraw/fees page
- **Backend**: `POST /api/wallet/request-fee-resolution` now includes urgency text with countdown deadline in email (>72h = days, ≤72h = hours)
- **Backend**: Admin create/update user endpoints handle timer configuration and reset
- **Frontend Admin**: Timer duration input in Create User (Step 4) and Edit User (Actions tab)
- **Frontend Admin**: Timer column in Users list showing status (-, Not started, Xh Ym, Expired badge)
- **Frontend Admin**: Edit User shows timer details (started, expires, remaining/expired, reset button)
- **Frontend User**: Live countdown (HH:MM:SS) in withdraw modal when fees are blocked and timer is active
- **Email**: Italian and English urgency blocks with time-sensitive notice injected into fee resolution emails
- **Files**: `models.py`, `server.py`, `email_service.py`, `AdminCreateUser.js`, `AdminEditUser.js`, `AdminUsers.js`, `WalletDashboard.js`

### Mar 2026 - Full Rebrand to Zenthos
- Complete brand migration, regulatory compliance, email templates, PWA metadata, database, i18n

### Mar 2026 - User Activity Log
- Activity tracking, admin-only Activity tab, logout tracking

### Mar 2026 - Anti-Phishing Compliance & Legal Pages
- Privacy Policy, Terms of Service, About Us, security headers, footer updates

### Mar 2026 - KYC iOS 12 Compatibility Fix
- Replaced programmatic .click() with native label approach for iOS 12

### Previous Sessions
- KYC Robustness Improvements, Forgot Password, KYC fixes, auto-unfreeze logic, admin badge fixes, email link fixes, health endpoint
- Domain migration eu-zenthos.com → x-zenthos.com
- Bank rename ECOMMBX → CHIANTIN BANK
- 100 EUR reactivation deposit removal
- Admin edit user password bug fix
- CDN session leakage fix (TokenRefreshMiddleware removed)

## Architecture
```
/app
├── backend/
│   ├── server.py          # Main API server (~3100 lines)
│   ├── email_service.py   # Zenthos-branded email templates
│   ├── models.py          # Data models
│   ├── auth.py            # JWT auth
│   └── tests/
│       └── test_expiry_timer.py
└── frontend/
    └── src/
        ├── pages/
        │   ├── admin/AdminCreateUser.js
        │   ├── admin/AdminEditUser.js
        │   ├── admin/AdminUsers.js
        │   ├── WalletDashboard.js
        │   ├── KYCPage.js
        │   ├── ForgotPasswordPage.js
        │   └── LandingPage.js
        ├── components/ErrorBoundary.js
        ├── contexts/AuthContext.js
        └── i18n.js
```

## Key Credentials
- Admin: admin@x-zenthos.com / admin123

## Prioritized Backlog
### P1
- Refactor backend/server.py into modular FastAPI routers

### P2
- Further PWA enhancements
- Performance optimizations

## Critical Notes for Future Agents
- **DO NOT Reintroduce Sliding Sessions/Token Refresh**: CDN cached X-Refreshed-Token causing cross-user session leakage
- **Cache Busting**: Frontend AuthContext.js uses `?_t=` parameter on GET requests
- **KYC Logic**: Admin-created users without unusual_activity/both freeze get auto-approved KYC
- **DNS/Email**: Resend emails may fail until user configures DKIM, MX, SPF, DMARC at Hostinger
