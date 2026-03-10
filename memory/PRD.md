# Blockchain.com Wallet Clone - PRD

## Original Problem Statement
Build a clone of the blockchain.com wallet/exchange with professional UI/UX, full Italian internationalization, KYC flow, live exchange rates, admin panel, and transactional email system.

## Core Architecture
- **Frontend:** React + Shadcn UI + Tailwind CSS
- **Backend:** FastAPI (Python)
- **Database:** MongoDB (local dev) / MongoDB Atlas (production)
- **Email:** Resend API
- **Media:** Cloudinary (KYC uploads)
- **DNS/SSL:** Cloudflare
- **Deployment:** Emergent Platform (Kubernetes)

## Key Features Implemented
- Professional UI with EN/IT internationalization
- User authentication (JWT with sliding sessions)
- Admin panel (user management, settings, KYC review)
- Live USDC/EUR exchange rate (Frankfurter API + server-side fluctuations)
- Video Selfie KYC liveness check (react-webcam + MediaRecorder)
- Locked withdrawal IBAN/SWIFT (admin-configurable)
- PWA configuration (cross-browser icons, manifest)
- Transactional emails via Resend (all types)
- Forgot Password flow (public endpoint, email with reset link)

## Current Domain
- Production: `secure-blockchainplatform.com`
- Preview: `crypto-wallet-kyc.preview.emergentagent.com`

## Key Credentials
- Admin: `admin@blockchain.com` / `admin123`

## Recent Changes (2026-03-09)
- Added root-level `/health` endpoint for K8s deployment
- Fixed `FRONTEND_URL` pointing to old preview URL (caused all email buttons to fail)
- Fixed `UNSUBSCRIBE_URL` pointing to old preview URL
- Updated `SENDER_EMAIL` and `REPLY_TO_EMAIL` to new domain
- Improved email button HTML (inline-block + fallback plain text link)
- Added "Forgot Password" feature (public endpoint + page + i18n)
- Migrated preview DB data to production Atlas
- DNS configuration for new domain via Cloudflare

## Production Secrets Required
| Key | Value |
|-----|-------|
| FRONTEND_URL | https://secure-blockchainplatform.com |
| UNSUBSCRIBE_URL | https://secure-blockchainplatform.com/api/unsubscribe |
| SENDER_EMAIL | noreply@secure-blockchainplatform.com |
| REPLY_TO_EMAIL | support@secure-blockchainplatform.com |
| REACT_APP_BACKEND_URL | https://secure-blockchainplatform.com |

## Backlog
- (P1) User verification of Video Selfie KYC flow
- (P2) Remove temporary migration endpoint from server.py
- (P3) Refactor backend/server.py into modular FastAPI routers
- (P3) Enhance PWA features
- (P3) Add admin event timeline / audit trail

## Known Issues
- Temporary migration endpoint still in server.py (should be removed after data is confirmed stable)
- New domain may need time to build email sending reputation (emails may go to spam initially)
