# Zenthos Wallet Platform - PRD

## Original Problem Statement
Build a professional wallet/exchange platform with polished UI/UX, full internationalization for Italian (i18n), robust KYC flow, live USDC/EUR exchange rates, sliding session mechanism for JWTs, and comprehensive admin panel.

## Tech Stack
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Integrations**: Resend (email), Cloudinary (KYC images/video)

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

### Mar 2026 - Full Rebrand to Zenthos
- **Complete brand migration**: All references to previous brand removed
- **Regulatory compliance**: Removed all false FCA/regulatory claims
- **Email templates**: All rebranded with Zenthos identity
- **PWA metadata**: Updated manifest, icons, service worker
- **Database**: Admin email and system settings updated
- **i18n**: Both EN and IT translations fully rebranded

### Mar 2026 - Anti-Phishing Compliance & Legal Pages
- **Privacy Policy page** (`/privacy`): Full UK GDPR-compliant privacy policy with company details
- **Terms of Service page** (`/terms`): Comprehensive ToS with legal jurisdiction, liability, KYC terms
- **About Us page** (`/about`): Company info, mission, values, registered address, incorporation date
- **Security headers**: Added X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, HSTS to all backend responses
- **Footer update**: Real links to legal pages, company address (45 Queen Street, Deal, Kent, CT14 6EY), support email
- **Files**: `PrivacyPolicyPage.js`, `TermsOfServicePage.js`, `AboutPage.js`, `LandingPage.js`, `App.js`, `server.py`

### Mar 2026 - KYC iOS 12 Compatibility Fix
- **Root Cause**: Programmatic `input.click()` fails silently on iOS 12 Safari (iPhone 6 and older)
- **Fix**: Replaced all programmatic `.click()` triggers on file inputs with native `<label htmlFor>` approach
- **Changes**: Buttons now render as `<label>` elements via `asChild`, file inputs use position-based hiding instead of `display:none`, simplified `accept` attribute to `image/*`
- **Files**: `frontend/src/pages/KYCPage.js`

### Previous Sessions
- KYC Robustness Improvements (in-app browser detection, desktop fix, video upload)
- Client Forgot Password flow
- KYC blank page fix for Xiaomi/Android
- "Unusual Activity" auto-unfreeze logic
- Admin notification badge fixes
- Email link fixes
- Health endpoint for Kubernetes

## Architecture
```
/app
├── backend/
│   ├── server.py          # Main API server
│   ├── email_service.py   # Zenthos-branded email templates
│   ├── models.py          # Data models
│   ├── auth.py            # JWT auth
│   └── tests/
└── frontend/
    └── src/
        ├── pages/KYCPage.js
        ├── pages/ForgotPasswordPage.js
        ├── pages/LandingPage.js
        ├── components/ErrorBoundary.js
        ├── contexts/AuthContext.js
        └── i18n.js                  # EN/IT translations (Zenthos branded)
```

## Key Credentials
- Admin: admin@zenthos.com / admin123

## Prioritized Backlog
### P1
- Refactor backend/server.py into modular FastAPI routers

### P2
- Further PWA enhancements
- Performance optimizations
