# Blockchain.com Wallet Clone - Product Requirements Document

## Overview
A simulated wallet/exchange platform that replicates Blockchain.com's functionality with full admin control. Everything looks and feels 100% real to users while admins have absolute control over all aspects.

## Tech Stack
- **Frontend**: React 19 + TypeScript + Tailwind CSS + ShadCN UI
- **Backend**: FastAPI (Python) 
- **Database**: MongoDB
- **Email**: Resend (configured with API key)
- **PWA**: Progressive Web App with install capability

## User Credentials

### Admin Access
- **Email**: admin@blockchain.com
- **Password**: admin123
- **URL**: /admin

### Test Frozen User
- **Email**: testfrozen@test.com
- **Password**: Test123!
- **Freeze Type**: unusual_activity

## Recent Bug Fixes (Dec 2025)

### Issue 1: Random Popup Bug - FIXED ✅
- **Problem**: Success popup "Email Sent Successfully" was appearing randomly on page load
- **Root Cause**: `useEffect` was auto-opening the freeze modal when `user.freeze_type !== 'none'`
- **Fix**: Removed auto-open behavior. Modal now ONLY opens after user clicks "Click here to fix your account" button
- **File**: `frontend/src/pages/WalletDashboard.js`

### Issue 2: Admin Data Loading Failures - FIXED ✅
- **Problem**: KYC Queue and Users list sometimes failed to load
- **Root Cause**: MongoDB `_id` ObjectId not excluded from queries, causing serialization errors
- **Fix**: Added `{"_id": 0}` to all relevant `find_one()` queries
- **Files**: `backend/server.py` (lines 635, 866, 1092)

### Issue 3: Auth Instability - FIXED ✅
- **Problem**: Intermittent authentication issues and potential redirect loops
- **Root Cause**: 401 interceptor doing hard redirects without protection
- **Fix**: Added redirect loop protection flag and improved error handling
- **File**: `frontend/src/contexts/AuthContext.js`

### Issue 4: Unpaid Fees Edge Case - FIXED ✅
- **Problem**: `sum()` of empty list returned `int` instead of `Decimal`
- **Fix**: Changed to `sum((Decimal(t["fee"]) for t in transactions), Decimal("0"))`
- **File**: `backend/server.py` (line 418)

### Features Implemented

## 1. Landing Page (/)
- Professional Blockchain.com-style design
- Company information (Founded 2011, London HQ, FCA Registered)
- Statistics section (90M+ wallets, $1T+ transactions, 200+ countries)
- Features and Security sections
- Sign Up / Log In buttons
- PWA install button (when browser supports)

## 2. User Wallet Dashboard (/wallet)
- Purple gradient header (matching design reference)
- Portfolio total balance display
- 24hr change indicator
- Action buttons: Swap, Send, Deposit, Withdraw
- Assets section: USDC (ERC-20) and EUR
- Connected Apps section
- Account information
- Bottom navigation (Home, Prices, NFTs, DEX)

## 3. Admin Panel (/admin)

### Dashboard
- Total Users / Active / Frozen statistics
- Pending KYC count
- Total transaction count
- Total USDC/EUR balances
- Total unpaid fees
- Quick action buttons

### User Management (/admin/users)
- List all users with search/filter
- View status, KYC status, freeze type, unpaid fees
- Actions: View, Edit, Delete, Send Emails

### Create User (/admin/users/create) - 4-Step Wizard
**Step 1: Basic Information**
- First name, Last name, Email, Username
- Password (with Generate button)
- Date of birth, Phone

**Step 2: Wallet Setup**
- ETH Wallet Address (with Generate button)
- Initial USDC Balance
- Initial EUR Balance

**Step 3: Transaction History**
- Toggle to auto-generate history
- Total unpaid fees amount
- Transaction date range (start/end)
- System automatically creates realistic transactions

**Step 4: Account Settings**
- Freeze Type: None / Unusual Activity / Inactivity / Both
- Connected App Name & Logo
- User Role: User / Admin / Superadmin

### Edit User (/admin/users/:id)
- All user details editable
- Wallet balance adjustment
- View transaction history
- Freeze/Unfreeze controls
- Send email buttons (KYC, Password Reset, Reactivation, Fee Payment)

### KYC Queue (/admin/kyc)
- List pending KYC submissions
- View uploaded documents (ID front/back, selfie, proof of address)
- Approve / Reject with reason

### Transactions (/admin/transactions)
- Filter by user, asset, type, status
- View all transaction details
- Delete transactions

### Audit Logs (/admin/audit-logs)
- All admin actions logged
- Filter by action type

### Settings (/admin/settings)
- Maintenance mode toggle
- Registration toggle
- Resend API key configuration
- Sender email configuration

## 4. Account Freeze System

### Freeze Types
1. **Unusual Activity** - User must complete KYC verification
2. **Inactivity** - User must make deposit to reactivate
3. **Both** - KYC first, then deposit

### User Flow for Frozen Accounts
1. User logs in, sees freeze modal with explanation
2. User clicks "Fix Account" button
3. System sends appropriate email (KYC or Reactivation)
4. After KYC approval, password reset email sent
5. After password reset, if inactivity freeze, reactivation email sent
6. User must deposit to reactivate
7. Outstanding fees must be paid before withdrawal

## 5. Email System (Resend Integration Ready)

### Email Templates
- **KYC Verification** - Request identity verification
- **Password Reset** - After KYC approval
- **Reactivation** - For inactivity freeze with wallet address
- **Fee Payment** - Outstanding fees notice
- **Welcome** - New user registration

### Configuration
Add Resend API key in Admin Settings (/admin/settings)

## 6. Transaction Auto-Generation Algorithm

When admin creates user with balance:
- System calculates number of transactions based on date range
- Distributes total balance across realistic transactions (deposits, receives, swaps)
- Distributes total fees across ~60-80% of transactions
- Creates realistic timestamps with business hour weighting
- Generates fake but realistic-looking ETH transaction hashes
- All transactions marked as fee_paid: false

## API Endpoints

### Auth
- POST /api/auth/login
- POST /api/auth/register
- GET /api/auth/me
- POST /api/auth/change-password
- POST /api/auth/reset-password/{token}

### User Wallet
- GET /api/wallet/balance
- GET /api/wallet/transactions
- GET /api/wallet/unpaid-fees

### KYC
- POST /api/kyc/submit
- GET /api/kyc/status

### Account
- POST /api/account/request-unfreeze

### Admin
- GET/POST /api/admin/users
- GET/PUT/DELETE /api/admin/users/{user_id}
- PUT /api/admin/wallets/{user_id}/{asset}
- GET/POST /api/admin/transactions
- PUT/DELETE /api/admin/transactions/{transaction_id}
- GET /api/admin/kyc-queue
- POST /api/admin/kyc/{user_id}/review
- POST /api/admin/users/{user_id}/send-email
- GET /api/admin/audit-logs
- GET /api/admin/email-logs
- GET/PUT /api/admin/settings
- GET /api/admin/stats

## Security Notes

- JWT authentication with 24-hour expiration
- Password hashing with bcrypt
- Role-based access control (RBAC)
- All admin actions logged in audit trail
- MongoDB ObjectId excluded from API responses

## Pending for User Configuration

1. **Resend API Key** - Get from resend.com/api-keys
2. **Verified Domain Email** - Must verify domain in Resend
3. **Frontend URL** - Set FRONTEND_URL environment variable for email links

## Database Collections
- users
- wallets
- transactions
- kyc_documents
- audit_logs
- email_logs
- system_settings
