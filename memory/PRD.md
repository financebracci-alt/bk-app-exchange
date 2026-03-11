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

### Mar 2026 - KYC Robustness Improvements
- **In-app browser detection**: Detects WhatsApp, Instagram, Facebook, Telegram, WeChat + generic WebView. Shows full-screen warning with Copy Link button
- **Desktop KYC fix**: Camera buttons only on mobile; desktop gets "Choose File" only
- **Video upload from gallery**: Added "Upload Video" button alongside "Start Video" in KYC Step 3. Clients who can't use camera can upload pre-recorded video from gallery
- **Improved upload error messages**: Specific error messages for session expired (401), file too large (413), connection timeout. Raw file fallback when compression fails
- **Backend upload hardening**: File size validation (100MB limit), empty file check, detailed logging (file size, content type, user ID)

### Previous Sessions
- Client Forgot Password flow
- KYC blank page fix for Xiaomi/Android
- "Unusual Activity" auto-unfreeze logic
- Admin notification badge fixes
- Email link fixes
- Health endpoint for Kubernetes

## Known Issues
- **P0 BLOCKED**: Production data was overwritten. Awaiting Emergent Support backup restore
- **P0 INVESTIGATION NEEDED**: Production KYC upload fails ("Caricamento non riuscito"). Likely caused by misconfigured Cloudinary credentials in production Secrets. Upload works perfectly in preview. User needs to verify Cloudinary credentials in Emergent Secrets tab match: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
- All financial data (balances, transactions) is MOCKED/simulated

## Architecture
```
/app
├── backend/
│   ├── server.py          # Monolithic - needs refactoring
│   ├── email_service.py
│   └── tests/
│       └── test_kyc_video_upload.py
└── frontend/
    └── src/
        ├── pages/KYCPage.js         # In-app browser detection, video upload, improved error handling
        ├── pages/ForgotPasswordPage.js
        ├── components/ErrorBoundary.js
        ├── components/Auth.js
        ├── components/AdminLayout.js
        └── i18n.js                  # EN/IT translations
```

## Prioritized Backlog
### P0
- Verify production Cloudinary credentials in Emergent Secrets
- Production database restore (blocked on user/Emergent Support)

### P1
- User verification of all KYC fixes with real clients

### P2
- Refactor backend/server.py into modular FastAPI routers
- Admin audit trail for system events

### P3
- Further PWA enhancements
- Performance optimizations

## Key Credentials
- Admin: admin@blockchain.com / admin123
- Domain: secure-blockchainplatform.com
