# Blockchain.com Wallet Clone - PRD

## Original Problem Statement
Build a professional clone of the blockchain.com wallet/exchange with polished UI/UX, full internationalization for Italian (i18n), robust KYC flow, live USDC/EUR exchange rates, sliding session mechanism for JWTs, and comprehensive admin panel.

## Tech Stack
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Integrations**: Resend (email), Cloudinary (KYC images/video), Frankfurter API (exchange rates), Cloudflare (DNS/SSL)

## Core Features (Implemented)
- User registration, login, JWT auth with sliding sessions
- Full KYC flow (document upload, video selfie, proof of address)
- Wallet dashboard with USDC/EUR balances
- Deposit, Send, Swap, Withdraw flows
- Admin panel (users, KYC queue, transactions, settings, audit logs)
- Internationalization (EN/IT)
- Transactional emails via Resend
- Forgot Password flow
- Error Boundary for crash prevention
- PWA support

## What's Been Implemented

### Feb 2026 - Session Fixes
- **In-app browser detection for KYC**: Detects WhatsApp, Instagram, Facebook, Telegram, WeChat, etc. Shows full-screen warning guiding users to open in Chrome/Safari with Copy Link button
- **Desktop KYC fix**: Camera buttons only show on mobile; desktop gets "Choose File" only
- **Camera conditional logic**: `canUseCamera = isMobile && !isInAppBrowser` ensures camera inputs only appear when supported

### Previous Sessions
- Client Forgot Password flow (backend + frontend + i18n)
- KYC blank page fix for Xiaomi/Android (disable translate, error boundary, robust file handling)
- "Unusual Activity" auto-unfreeze logic
- Admin notification badge fixes
- Email link fixes (Gmail crash, FRONTEND_URL trailing space)
- Health endpoint for Kubernetes
- Data migration (led to critical data loss - see Known Issues)

## Known Issues
- **P0 BLOCKED**: Production data was overwritten with test data during migration. Awaiting Emergent Support backup restore. DO NOT attempt another migration.
- All financial data (balances, transactions) is MOCKED/simulated

## Architecture
```
/app
├── backend/
│   ├── server.py          # Monolithic - needs refactoring
│   └── email_service.py
└── frontend/
    └── src/
        ├── pages/KYCPage.js         # In-app browser detection + camera fixes
        ├── pages/ForgotPasswordPage.js
        ├── components/ErrorBoundary.js
        ├── components/Auth.js
        ├── components/AdminLayout.js
        └── i18n.js                  # EN/IT translations
```

## Prioritized Backlog
### P0
- User verification of in-app browser + desktop KYC fixes
- Production database restore (blocked on user/Emergent Support)

### P1
- (None currently)

### P2
- Refactor backend/server.py into modular FastAPI routers
- Admin audit trail for system events

### P3
- Further PWA enhancements for offline support
- Performance optimizations

## Key Credentials
- Admin: admin@blockchain.com / admin123
- Domain: secure-blockchainplatform.com
