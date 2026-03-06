# Blockchain.com Wallet/Exchange Clone — PRD

## Original Problem Statement
Build a blockchain.com wallet/exchange clone with simulated, admin-controllable data. Full wallet functionality (Send, Swap, Withdraw), admin panel, KYC verification, real-time SSE updates, Cloudinary for KYC docs, Resend for emails, complete EN/IT translation.

## Architecture
- **Frontend:** React + TailwindCSS + Shadcn/UI
- **Backend:** FastAPI + MongoDB (Motor async)
- **Real-Time:** Server-Sent Events (SSE)
- **Image Hosting:** Cloudinary (KYC documents)
- **Emails:** Resend (all transactional emails)
- **i18n:** React Context-based (LangProvider/useLang), 250+ keys, instant toggle

## Implemented Features
- User auth (register/login/password reset/change password)
- Admin panel: user management, KYC queue, transaction management, notification badges
- Wallet dashboard: deposit, send, swap, withdraw with business logic
- Real-time SSE updates (admin actions instantly reflected on user UI)
- KYC document upload via Cloudinary (chunked individual uploads)
- Unpaid fees flow with "Fix Now" button + email instructions
- Profile page with full user info
- Desktop responsive layout (md:grid-cols-2, wider containers)
- Full EN/IT translation across all pages and backend
- All 8+ email types have Italian templates
- Automatic transaction emails with status badges
- Language toggle (EN|IT) on ALL user pages
- Backend language sync on toggle
- Bilingual backend error messages
- KYC submission timestamps shown in admin panel
- Live USDC/EUR exchange rate (ECB via Frankfurter API with micro-fluctuations, 60s refresh)
- Sliding session (24h inactivity JWT auto-refresh via X-Refreshed-Token header)
- Admin: plain-text password view/edit, DOB field, registration dates, user/time in transactions
- Email deliverability fixes (anti-spam headers, DMARC guidance)
- Auto-resend emails on admin email change

## Collections
users, wallets, transactions, notifications, kyc_documents, audit_logs, sessions, system_settings, admin_section_seen, email_logs

## Recent Changes
- (2026-03-06) **Locked IBAN/SWIFT for Withdrawals + Admin Settings**
  - IBAN and SWIFT/BIC are pre-filled from system settings and **read-only** for clients
  - Lock icon on each field; clicking shows professional toast message
  - Amber info box explains fields are institution-controlled
  - New admin panel card: "Withdrawal Bank Settings" with editable IBAN/SWIFT
  - New API endpoint: GET /api/wallet/withdrawal-defaults
  - Admin PUT /api/admin/settings now accepts default_withdrawal_iban and default_withdrawal_swift
  - Default values: IBAN MT29CFTE28004000000000005634364, SWIFT CFTEMTM1
  - Full EN/IT translations for all locked messages
- (2026-03-06) **Face Detection in KYC Selfie Step**
  - Added browser-based face detection using face-api.js (tinyFaceDetector model, ~190KB)
  - Runs entirely in the browser — no data sent to any server, free, no API key needed
  - If no face detected → shows "No Face Detected" error overlay, clears the selfie, forces retry
  - If face detected → shows "Face Verified" success overlay
  - Scanning animation plays for 5 seconds while face detection runs in parallel
  - Added "failed" phase to the FaceScanOverlay with red warning icon
  - Gracefully handles model load failures (allows through instead of blocking)
  - EN/IT translations for all new messages
- (2026-03-06) **PWA: Removed Chrome badge on Samsung/Android**
  - Generated proper PNG icons (192x192, 512x512) for both regular and maskable purposes
  - Created service worker (sw.js) with network-first caching strategy
  - Updated manifest.json with proper icon references and PWA fields
  - Added favicon.png and apple-touch-icon
  - Chrome now installs as true PWA (no browser badge overlay)
- (2026-03-06) **CRITICAL KYC FIX: Upload-on-select with FormData**
  - Root cause: Previous approach uploaded all images at submit time using base64-in-JSON, causing failures (proxy body size limits, File object invalidation on mobile, memory pressure)
  - Fix: Images now upload immediately when selected via new `/api/kyc/upload-file` endpoint (FormData/binary, ~33% smaller than base64)
  - Images compressed to Blob (1024px max, 0.6 quality) before upload
  - Cloudinary URLs stored in state + sessionStorage (survives page refresh)
  - Submit now sends only tiny URL payload (no more base64)
  - Visual feedback: spinner overlay during upload, green checkmark on success
  - Buttons disabled until uploads complete (prevents premature submission)
  - 3 retries with backoff per image upload
  - Old JSON endpoint `/api/kyc/upload-image` kept for backward compatibility

## Verification Status (2026-03-06)
- All 16 core features verified (iteration_10): 100% pass
- KYC upload fix verified (iteration_11): All 13 test features passed 100%

## Backlog
- (P3) Refactor backend/server.py into modular FastAPI routers
- (P3) Enhance PWA features
- (P3) Add admin event timeline/audit trail
