"""
Blockchain Wallet Platform - Main Server
FastAPI backend with MongoDB
"""

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query
from fastapi.responses import JSONResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import asyncio
from pathlib import Path
from typing import List, Optional
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from decimal import Decimal

# Local imports
from models import (
    User, UserCreate, UserUpdate, UserLogin, UserPublic, UserRole, AccountStatus,
    FreezeType, KYCStatus, Wallet, WalletUpdate, AssetType,
    Transaction, TransactionCreate, TransactionType, TransactionStatus,
    KYCDocument, KYCSubmit, KYCReview,
    AuditLog, EmailLog, SystemSettings, Session, Notification
)
from auth import (
    hash_password, verify_password, create_access_token, decode_token,
    get_current_user, require_admin, require_superadmin,
    generate_reset_token, generate_verification_token
)
from transaction_generator import generate_transaction_history, generate_fake_eth_address
from email_service import get_email_service

# Setup
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'blockchain_wallet')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Create the main app
app = FastAPI(title="Blockchain Wallet API", version="1.0.0")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============== SSE EVENT SYSTEM ==============
user_event_queues: dict = defaultdict(list)


async def notify_user(user_id: str, event_type: str, data: dict):
    """Push an event to all connected SSE clients for a given user."""
    event_json = json.dumps({"type": event_type, "data": data})
    dead = []
    for q in user_event_queues.get(user_id, []):
        try:
            q.put_nowait(event_json)
        except Exception:
            dead.append(q)
    for q in dead:
        try:
            user_event_queues[user_id].remove(q)
        except ValueError:
            pass


# ============== HELPER FUNCTIONS ==============

async def log_audit(admin_id: str, admin_email: str, action: str, target_type: str, target_id: str, details: dict = None, ip_address: str = None):
    """Create an audit log entry"""
    audit = AuditLog(
        admin_id=admin_id,
        admin_email=admin_email,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details or {},
        ip_address=ip_address
    )
    await db.audit_logs.insert_one(audit.model_dump())


async def get_user_by_id(user_id: str) -> Optional[dict]:
    """Get user by ID"""
    return await db.users.find_one({"id": user_id}, {"_id": 0})


async def get_user_by_email(email: str) -> Optional[dict]:
    """Get user by email"""
    return await db.users.find_one({"email": email.lower()}, {"_id": 0})


def user_to_public(user: dict) -> dict:
    """Convert user dict to public format"""
    return UserPublic(**user).model_dump()


# ============== STARTUP ==============

@app.on_event("startup")
async def startup_event():
    """Initialize database and create default admin"""
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    await db.users.create_index("id", unique=True)
    await db.wallets.create_index([("user_id", 1), ("asset", 1)], unique=True)
    await db.transactions.create_index("user_id")
    await db.transactions.create_index("wallet_id")
    await db.kyc_documents.create_index("user_id")
    await db.audit_logs.create_index("admin_id")
    await db.audit_logs.create_index("created_at")
    await db.admin_section_seen.create_index([("admin_id", 1), ("section", 1)], unique=True)
    
    # Create default superadmin if not exists
    admin_email = "admin@blockchain.com"
    existing_admin = await db.users.find_one({"email": admin_email})
    
    if not existing_admin:
        admin_user = User(
            email=admin_email,
            username="admin",
            password_hash=hash_password("admin123"),
            first_name="System",
            last_name="Administrator",
            date_of_birth="1990-01-01",
            role=UserRole.SUPERADMIN,
            account_status=AccountStatus.ACTIVE,
            kyc_status=KYCStatus.APPROVED,
            email_verified=True
        )
        await db.users.insert_one(admin_user.model_dump())
        logger.info("Default admin created: admin@blockchain.com / admin123")
    
    # Create default system settings if not exists
    settings = await db.system_settings.find_one({"id": "system_settings"}, {"_id": 0})
    if not settings:
        default_settings = SystemSettings()
        await db.system_settings.insert_one(default_settings.model_dump())
        logger.info("Default system settings created")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "Blockchain Wallet API", "status": "online"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# ============== AUTH ROUTES ==============

@api_router.post("/auth/login")
async def login(credentials: UserLogin, request: Request):
    """User login"""
    user = await get_user_by_email(credentials.email)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user["account_status"] == AccountStatus.CLOSED:
        raise HTTPException(status_code=403, detail="Account has been closed")
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create token
    token = create_access_token(user["id"], user["email"], user["role"])
    
    # Get user's wallets
    wallets = await db.wallets.find({"user_id": user["id"]}, {"_id": 0}).to_list(10)
    
    return {
        "ok": True,
        "data": {
            "token": token,
            "user": user_to_public(user),
            "wallets": wallets
        }
    }


@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    """Public user registration"""
    # Check if registration is allowed
    settings = await db.system_settings.find_one({"id": "system_settings"}, {"_id": 0})
    if settings and not settings.get("allow_registration", True):
        raise HTTPException(status_code=403, detail="Registration is currently disabled")
    
    # Check if email exists
    existing = await get_user_by_email(user_data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username exists
    existing_username = await db.users.find_one({"username": user_data.username.lower()}, {"_id": 0})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create user
    user = User(
        email=user_data.email.lower(),
        username=user_data.username.lower(),
        password_hash=hash_password(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        date_of_birth=user_data.date_of_birth,
        phone=user_data.phone,
        role=UserRole.USER,
        account_status=AccountStatus.ACTIVE,
        eth_wallet_address=generate_fake_eth_address()
    )
    
    await db.users.insert_one(user.model_dump())
    
    # Create wallets
    usdc_wallet = Wallet(user_id=user.id, asset=AssetType.USDC)
    eur_wallet = Wallet(user_id=user.id, asset=AssetType.EUR)
    await db.wallets.insert_one(usdc_wallet.model_dump())
    await db.wallets.insert_one(eur_wallet.model_dump())
    
    # Create token
    token = create_access_token(user.id, user.email, user.role)
    
    return {
        "ok": True,
        "data": {
            "token": token,
            "user": user_to_public(user.model_dump())
        }
    }


@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    user = await get_user_by_id(current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    wallets = await db.wallets.find({"user_id": user["id"]}, {"_id": 0}).to_list(10)
    
    return {
        "ok": True,
        "data": {
            "user": user_to_public(user),
            "wallets": wallets
        }
    }


@api_router.post("/auth/change-password")
async def change_password(
    current_password: str,
    new_password: str,
    current_user: dict = Depends(get_current_user)
):
    """Change user password"""
    user = await get_user_by_id(current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "password_hash": hash_password(new_password),
                "password_reset_required": False,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"ok": True, "message": "Password changed successfully"}


@api_router.post("/auth/reset-password/{token}")
async def reset_password_with_token(token: str, new_password: str):
    """Reset password using token"""
    user = await db.users.find_one({"password_reset_token": token}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    # Check if token expired
    if user.get("password_reset_expires"):
        expires = datetime.fromisoformat(user["password_reset_expires"])
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=400, detail="Token has expired")
    
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "password_hash": hash_password(new_password),
                "password_reset_required": False,
                "password_reset_token": None,
                "password_reset_expires": None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"ok": True, "message": "Password reset successfully"}


@api_router.post("/auth/kyc-access/{token}")
async def kyc_access_with_token(token: str):
    """Authenticate user via KYC access token from email link"""
    user = await db.users.find_one({"kyc_access_token": token}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    # Check if token expired
    if user.get("kyc_access_expires"):
        expires = datetime.fromisoformat(user["kyc_access_expires"])
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=400, detail="Token has expired")
    
    # Create JWT token for the user
    jwt_token = create_access_token(user["id"], user["email"], user["role"])
    
    # Get wallets
    wallets = await db.wallets.find({"user_id": user["id"]}, {"_id": 0}).to_list(10)
    
    return {
        "ok": True,
        "data": {
            "token": jwt_token,
            "user": user_to_public(user),
            "wallets": wallets
        }
    }



# ============== USER WALLET ROUTES ==============

@api_router.get("/wallet/balance")
async def get_wallet_balance(current_user: dict = Depends(get_current_user)):
    """Get user's wallet balances"""
    wallets = await db.wallets.find({"user_id": current_user["user_id"]}, {"_id": 0}).to_list(10)
    
    total_usd = Decimal("0")
    for w in wallets:
        if w["asset"] == "USDC":
            total_usd += Decimal(w["balance"])
        elif w["asset"] == "EUR":
            # Convert EUR to USD (approximate rate)
            total_usd += Decimal(w["balance"]) * Decimal("1.08")
    
    return {
        "ok": True,
        "data": {
            "wallets": wallets,
            "total_usd": str(total_usd.quantize(Decimal("0.01")))
        }
    }


@api_router.get("/wallet/transactions")
async def get_user_transactions(
    asset: Optional[str] = None,
    type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get user's transaction history"""
    query = {"user_id": current_user["user_id"]}
    
    if asset:
        query["asset"] = asset
    if type:
        query["type"] = type
    
    total = await db.transactions.count_documents(query)
    skip = (page - 1) * page_size
    
    transactions = await db.transactions.find(query, {"_id": 0})\
        .sort("transaction_date", -1)\
        .skip(skip)\
        .limit(page_size)\
        .to_list(page_size)
    
    return {
        "ok": True,
        "data": {
            "transactions": transactions,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size
        }
    }


@api_router.get("/wallet/unpaid-fees")
async def get_unpaid_fees(current_user: dict = Depends(get_current_user)):
    """Get user's unpaid transaction fees"""
    user = await get_user_by_id(current_user["user_id"])
    
    # Get transactions with unpaid fees
    transactions = await db.transactions.find({
        "user_id": current_user["user_id"],
        "fee_paid": False,
        "fee": {"$ne": "0.00"}
    }, {"_id": 0}).to_list(1000)
    
    total_fees = sum((Decimal(t["fee"]) for t in transactions), Decimal("0"))
    
    return {
        "ok": True,
        "data": {
            "total_unpaid_fees": str(total_fees.quantize(Decimal("0.01"))),
            "fees_paid": user.get("fees_paid", False),
            "transactions_with_fees": len(transactions)
        }
    }


# ============== KYC ROUTES ==============

@api_router.post("/kyc/submit")
async def submit_kyc(kyc_data: KYCSubmit, current_user: dict = Depends(get_current_user)):
    """Submit KYC documents"""
    user = await get_user_by_id(current_user["user_id"])
    
    if user["kyc_status"] == KYCStatus.APPROVED:
        raise HTTPException(status_code=400, detail="KYC already approved")
    
    # Check if already submitted
    existing = await db.kyc_documents.find_one({"user_id": current_user["user_id"]}, {"_id": 0})
    
    kyc_doc = KYCDocument(
        user_id=current_user["user_id"],
        id_document_type=kyc_data.id_document_type,
        id_document_front=kyc_data.id_document_front,
        id_document_back=kyc_data.id_document_back,
        selfie_with_id=kyc_data.selfie_with_id,
        proof_of_address=kyc_data.proof_of_address,
        status=KYCStatus.PENDING
    )
    
    if existing:
        await db.kyc_documents.update_one(
            {"user_id": current_user["user_id"]},
            {"$set": kyc_doc.model_dump()}
        )
    else:
        await db.kyc_documents.insert_one(kyc_doc.model_dump())
    
    # Update user status
    await db.users.update_one(
        {"id": current_user["user_id"]},
        {
            "$set": {
                "kyc_status": KYCStatus.PENDING,
                "kyc_submitted_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"ok": True, "message": "KYC documents submitted successfully"}


@api_router.get("/kyc/status")
async def get_kyc_status(current_user: dict = Depends(get_current_user)):
    """Get KYC status"""
    user = await get_user_by_id(current_user["user_id"])
    kyc_doc = await db.kyc_documents.find_one({"user_id": current_user["user_id"]}, {"_id": 0})
    
    return {
        "ok": True,
        "data": {
            "status": user["kyc_status"],
            "submitted_at": user.get("kyc_submitted_at"),
            "reviewed_at": user.get("kyc_reviewed_at"),
            "rejection_reason": kyc_doc.get("rejection_reason") if kyc_doc else None
        }
    }


# ============== FREEZE/UNFREEZE ACTION ROUTES ==============

@api_router.post("/account/request-unfreeze")
async def request_unfreeze(current_user: dict = Depends(get_current_user)):
    """User requests to unfreeze their account - triggers email"""
    user = await get_user_by_id(current_user["user_id"])
    
    if user["freeze_type"] == FreezeType.NONE:
        raise HTTPException(status_code=400, detail="Account is not frozen")
    
    # Get frontend URL from settings or environment
    frontend_url = os.environ.get("FRONTEND_URL", "https://blockchain.com")
    
    # Generate a KYC access token for this user (valid for 24 hours)
    kyc_token = generate_verification_token()
    kyc_expires = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    
    # Store the KYC token in the user record
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "kyc_access_token": kyc_token,
            "kyc_access_expires": kyc_expires
        }}
    )
    
    # Handle different freeze types
    if user["freeze_type"] in [FreezeType.UNUSUAL_ACTIVITY, FreezeType.BOTH]:
        # Send KYC verification email with token
        subject, html_body = get_email_service().get_kyc_verification_email(
            user_name=f"{user['first_name']} {user['last_name']}",
            verification_link=f"{frontend_url}/kyc?token={kyc_token}"
        )
        
        result = await get_email_service().send_email(user["email"], subject, html_body)
        
        # Log email
        email_log = EmailLog(
            user_id=user["id"],
            user_email=user["email"],
            email_type="kyc_verification",
            subject=subject,
            body=html_body,
            sent=result.get("success", False),
            sent_at=result.get("sent_at"),
            error=result.get("error"),
            resend_id=result.get("resend_id")
        )
        await db.email_logs.insert_one(email_log.model_dump())
        
        return {
            "ok": True,
            "message": "Verification email has been sent. Please check your inbox and follow the instructions to verify your identity."
        }
    
    elif user["freeze_type"] == FreezeType.INACTIVITY:
        # Send reactivation email
        subject, html_body = get_email_service().get_reactivation_email(
            user_name=f"{user['first_name']} {user['last_name']}",
            eth_wallet_address=user.get("eth_wallet_address", "Not assigned")
        )
        
        result = await get_email_service().send_email(user["email"], subject, html_body)
        
        # Log email
        email_log = EmailLog(
            user_id=user["id"],
            user_email=user["email"],
            email_type="reactivation",
            subject=subject,
            body=html_body,
            sent=result.get("success", False),
            sent_at=result.get("sent_at"),
            error=result.get("error"),
            resend_id=result.get("resend_id")
        )
        await db.email_logs.insert_one(email_log.model_dump())
        
        return {
            "ok": True,
            "message": "Reactivation instructions have been sent to your email."
        }
    
    return {"ok": True, "message": "Request processed"}


@api_router.post("/account/resend-password-reset")
async def resend_password_reset(request: Request, current_user: dict = Depends(get_current_user)):
    """Resend password reset email for users with password_reset_required"""
    user = await get_user_by_id(current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.get("password_reset_required"):
        raise HTTPException(status_code=400, detail="Password reset is not required for this account")
    
    # Generate new password reset token
    reset_token = generate_reset_token()
    now = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "password_reset_token": reset_token,
            "password_reset_expires": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "updated_at": now
        }}
    )
    
    # Send the KYC approved email with password reset link
    frontend_url = os.environ.get("FRONTEND_URL", request.headers.get("origin", "https://blockchain.com"))
    subject, html_body = get_email_service().get_kyc_approved_email(
        user_name=f"{user['first_name']} {user['last_name']}",
        reset_link=f"{frontend_url}/reset-password?token={reset_token}"
    )
    
    result = await get_email_service().send_email(user["email"], subject, html_body)
    
    # Log the email
    email_log = EmailLog(
        user_id=user["id"],
        user_email=user["email"],
        email_type="password_reset_resend",
        subject=subject,
        body=html_body,
        sent=result.get("success", False),
        sent_at=result.get("sent_at"),
        error=result.get("error"),
        resend_id=result.get("resend_id")
    )
    await db.email_logs.insert_one(email_log.model_dump())
    
    if result.get("success"):
        return {"ok": True, "message": "Password reset email sent successfully"}
    else:
        return {"ok": True, "message": "Email queued", "warning": result.get("error")}


# ============== ADMIN ROUTES ==============

# --- Admin User Management ---

@api_router.get("/admin/users")
async def admin_list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    role: Optional[str] = None,
    kyc_status: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    """List all users (admin only)"""
    query = {}
    
    if search:
        query["$or"] = [
            {"email": {"$regex": search, "$options": "i"}},
            {"username": {"$regex": search, "$options": "i"}},
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}}
        ]
    
    if status:
        query["account_status"] = status
    if role:
        query["role"] = role
    if kyc_status:
        query["kyc_status"] = kyc_status
    
    total = await db.users.count_documents(query)
    skip = (page - 1) * page_size
    
    users = await db.users.find(query, {"password_hash": 0, "_id": 0})\
        .sort("created_at", -1)\
        .skip(skip)\
        .limit(page_size)\
        .to_list(page_size)
    
    return {
        "ok": True,
        "data": {
            "users": users,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size
        }
    }


@api_router.get("/admin/users/{user_id}")
async def admin_get_user(user_id: str, admin: dict = Depends(require_admin)):
    """Get user details (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"password_hash": 0, "_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    wallets = await db.wallets.find({"user_id": user_id}, {"_id": 0}).to_list(10)
    kyc_doc = await db.kyc_documents.find_one({"user_id": user_id}, {"_id": 0})
    
    # Get transaction summary
    tx_count = await db.transactions.count_documents({"user_id": user_id})
    
    return {
        "ok": True,
        "data": {
            "user": user,
            "wallets": wallets,
            "kyc": kyc_doc,
            "transaction_count": tx_count
        }
    }


@api_router.post("/admin/users")
async def admin_create_user(user_data: UserCreate, request: Request, admin: dict = Depends(require_admin)):
    """Create a new user account (admin only)"""
    
    # Check if email exists
    existing = await get_user_by_email(user_data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username exists
    existing_username = await db.users.find_one({"username": user_data.username.lower()}, {"_id": 0})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Generate ETH wallet address if not provided
    eth_address = user_data.eth_wallet_address or generate_fake_eth_address()
    
    # Create user
    user = User(
        email=user_data.email.lower(),
        username=user_data.username.lower(),
        password_hash=hash_password(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        date_of_birth=user_data.date_of_birth,
        phone=user_data.phone,
        role=user_data.role,
        account_status=AccountStatus.ACTIVE if user_data.freeze_type == FreezeType.NONE else AccountStatus.FROZEN,
        freeze_type=user_data.freeze_type,
        eth_wallet_address=eth_address,
        connected_app_name=user_data.connected_app_name,
        connected_app_logo=user_data.connected_app_logo,
        total_unpaid_fees=user_data.total_fees or "0.00",
        created_by=admin["user_id"]
    )
    
    await db.users.insert_one(user.model_dump())
    
    # Create USDC wallet
    usdc_wallet = Wallet(
        user_id=user.id,
        asset=AssetType.USDC,
        balance=user_data.initial_usdc_balance or "0.00"
    )
    await db.wallets.insert_one(usdc_wallet.model_dump())
    
    # Create EUR wallet
    eur_wallet = Wallet(
        user_id=user.id,
        asset=AssetType.EUR,
        balance=user_data.initial_eur_balance or "0.00"
    )
    await db.wallets.insert_one(eur_wallet.model_dump())
    
    # Generate transaction history if balance and dates provided
    tx_generated = 0
    if (user_data.initial_usdc_balance and 
        Decimal(user_data.initial_usdc_balance) > 0 and
        user_data.transaction_start_date and 
        user_data.transaction_end_date):
        
        try:
            transactions = generate_transaction_history(
                user_id=user.id,
                wallet_id=usdc_wallet.id,
                total_balance=user_data.initial_usdc_balance,
                total_fees=user_data.total_fees or "0.00",
                start_date=user_data.transaction_start_date,
                end_date=user_data.transaction_end_date,
                asset="USDC"
            )
            
            # Set admin_id for all transactions
            for tx in transactions:
                tx["admin_id"] = admin["user_id"]
            
            if transactions:
                await db.transactions.insert_many(transactions)
                tx_generated = len(transactions)
                logger.info(f"Generated {tx_generated} transactions for new user {user.email}")
        except Exception as e:
            logger.error(f"Failed to generate transaction history for {user.email}: {str(e)}")
            # Do NOT re-raise — user is already created, just skip history
    
    # Audit log
    await log_audit(
        admin_id=admin["user_id"],
        admin_email=admin["email"],
        action="user_created",
        target_type="user",
        target_id=user.id,
        details={
            "email": user.email,
            "initial_usdc_balance": user_data.initial_usdc_balance,
            "total_fees": user_data.total_fees,
            "freeze_type": user_data.freeze_type,
            "transactions_generated": tx_generated
        },
        ip_address=request.client.host if request.client else None
    )
    
    logger.info(f"User created successfully: {user.email} (id={user.id}, txs={tx_generated})")
    
    return {
        "ok": True,
        "data": {
            "user": user_to_public(user.model_dump()),
            "wallets": [usdc_wallet.model_dump(), eur_wallet.model_dump()],
            "transactions_generated": tx_generated
        }
    }


@api_router.put("/admin/users/{user_id}")
async def admin_update_user(user_id: str, updates: UserUpdate, request: Request, admin: dict = Depends(require_admin)):
    """Update user details (admin only)"""
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Update account status based on freeze type
    if "freeze_type" in update_data:
        if update_data["freeze_type"] == FreezeType.NONE:
            update_data["account_status"] = AccountStatus.ACTIVE
        else:
            update_data["account_status"] = AccountStatus.FROZEN
            update_data["freeze_date"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    # Audit log
    await log_audit(
        admin_id=admin["user_id"],
        admin_email=admin["email"],
        action="user_updated",
        target_type="user",
        target_id=user_id,
        details=update_data,
        ip_address=request.client.host if request.client else None
    )
    
    updated_user = await get_user_by_id(user_id)
    return {"ok": True, "data": {"user": user_to_public(updated_user)}}


@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, request: Request, admin: dict = Depends(require_admin)):
    """Delete a user (admin only)"""
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't allow deleting superadmins unless you're a superadmin
    if user["role"] == UserRole.SUPERADMIN and admin["role"] != "superadmin":
        raise HTTPException(status_code=403, detail="Cannot delete superadmin")
    
    # Delete user and related data
    await db.users.delete_one({"id": user_id})
    await db.wallets.delete_many({"user_id": user_id})
    await db.transactions.delete_many({"user_id": user_id})
    await db.kyc_documents.delete_many({"user_id": user_id})
    
    # Audit log
    await log_audit(
        admin_id=admin["user_id"],
        admin_email=admin["email"],
        action="user_deleted",
        target_type="user",
        target_id=user_id,
        details={"email": user["email"]},
        ip_address=request.client.host if request.client else None
    )
    
    return {"ok": True, "message": "User deleted successfully"}


# --- Admin Wallet Management ---

@api_router.put("/admin/wallets/{user_id}/{asset}")
async def admin_update_wallet(
    user_id: str,
    asset: str,
    balance: Optional[str] = None,
    request: Request = None,
    admin: dict = Depends(require_admin)
):
    """Update user's wallet balance (admin only)"""
    wallet = await db.wallets.find_one({"user_id": user_id, "asset": asset.upper()}, {"_id": 0})
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    old_balance = wallet["balance"]
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if balance is not None:
        update_data["balance"] = balance
    
    await db.wallets.update_one(
        {"user_id": user_id, "asset": asset.upper()},
        {"$set": update_data}
    )
    
    # Audit log
    await log_audit(
        admin_id=admin["user_id"],
        admin_email=admin["email"],
        action="wallet_balance_adjusted",
        target_type="wallet",
        target_id=wallet["id"],
        details={
            "user_id": user_id,
            "asset": asset,
            "old_balance": old_balance,
            "new_balance": balance
        },
        ip_address=request.client.host if request and request.client else None
    )
    
    updated_wallet = await db.wallets.find_one({"user_id": user_id, "asset": asset.upper()}, {"_id": 0})
    return {"ok": True, "data": {"wallet": updated_wallet}}


# --- Admin Transaction Management ---

@api_router.get("/admin/transactions")
async def admin_list_transactions(
    user_id: Optional[str] = None,
    asset: Optional[str] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: dict = Depends(require_admin)
):
    """List all transactions (admin only)"""
    query = {}
    
    if user_id:
        query["user_id"] = user_id
    if asset:
        query["asset"] = asset.upper()
    if type:
        query["type"] = type
    if status:
        query["status"] = status
    
    total = await db.transactions.count_documents(query)
    skip = (page - 1) * page_size
    
    transactions = await db.transactions.find(query, {"_id": 0})\
        .sort("transaction_date", -1)\
        .skip(skip)\
        .limit(page_size)\
        .to_list(page_size)
    
    return {
        "ok": True,
        "data": {
            "transactions": transactions,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size
        }
    }


@api_router.post("/admin/transactions")
async def admin_create_transaction(
    tx_data: TransactionCreate,
    request: Request,
    admin: dict = Depends(require_admin)
):
    """Create a transaction manually (admin only)"""
    user = await get_user_by_id(tx_data.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    wallet = await db.wallets.find_one({"user_id": tx_data.user_id, "asset": tx_data.asset}, {"_id": 0})
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    tx = Transaction(
        user_id=tx_data.user_id,
        wallet_id=wallet["id"],
        type=tx_data.type,
        asset=tx_data.asset,
        amount=tx_data.amount,
        fee=tx_data.fee,
        fee_paid=tx_data.fee_paid,
        status=tx_data.status,
        description=tx_data.description,
        reference=f"ADM{datetime.now().strftime('%Y%m%d%H%M%S')}",
        counterparty_address=tx_data.counterparty_address,
        transaction_date=tx_data.transaction_date or datetime.now(timezone.utc).isoformat(),
        created_by_admin=True,
        admin_id=admin["user_id"]
    )
    
    await db.transactions.insert_one(tx.model_dump())
    
    # Update wallet balance for deposits/receives
    if tx_data.type in [TransactionType.DEPOSIT, TransactionType.RECEIVE]:
        new_balance = Decimal(wallet["balance"]) + Decimal(tx_data.amount)
        await db.wallets.update_one(
            {"id": wallet["id"]},
            {"$set": {"balance": str(new_balance)}}
        )
    elif tx_data.type in [TransactionType.WITHDRAWAL, TransactionType.SEND]:
        new_balance = Decimal(wallet["balance"]) - Decimal(tx_data.amount)
        await db.wallets.update_one(
            {"id": wallet["id"]},
            {"$set": {"balance": str(new_balance)}}
        )
    
    # Update user's total unpaid fees if fee > 0 and fee not marked as paid
    if Decimal(tx_data.fee) > 0 and not tx_data.fee_paid:
        current_fees = Decimal(user.get("total_unpaid_fees", "0"))
        new_fees = current_fees + Decimal(tx_data.fee)
        await db.users.update_one(
            {"id": tx_data.user_id},
            {"$set": {"total_unpaid_fees": str(new_fees)}}
        )
    
    # AUTO-UNFREEZE: If user has inactivity freeze and receives a deposit, unfreeze them
    if tx_data.type in [TransactionType.DEPOSIT, TransactionType.RECEIVE]:
        if user.get("freeze_type") == "inactivity":
            # Unfreeze the account
            await db.users.update_one(
                {"id": tx_data.user_id},
                {"$set": {
                    "freeze_type": "none",
                    "account_status": "active",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        elif user.get("freeze_type") == "both":
            # If both, check if KYC is already approved
            if user.get("kyc_status") == "approved" and not user.get("password_reset_required"):
                # Fully unfreeze
                await db.users.update_one(
                    {"id": tx_data.user_id},
                    {"$set": {
                        "freeze_type": "none",
                        "account_status": "active",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
    
    # ── Notification + Email for admin-created transaction ──
    try:
        notif = Notification(
            user_id=tx_data.user_id,
            title=f"New {tx_data.type.value.capitalize()}",
            message=f"{tx_data.type.value.capitalize()} of {tx_data.amount} {tx_data.asset.value} has been recorded on your account.",
            type="transaction",
            data={"transaction_id": tx.id, "amount": tx_data.amount, "asset": tx_data.asset.value}
        )
        await db.notifications.insert_one(notif.model_dump())
        await notify_user(tx_data.user_id, "transaction_created", {
            "transaction_id": tx.id, "type": tx_data.type.value, "amount": tx_data.amount, "asset": tx_data.asset.value,
        })
        tx_date_str = tx_data.transaction_date or datetime.now(timezone.utc).isoformat()
        subj, body_html = get_email_service().get_transaction_notification_email(
            user_name=f"{user['first_name']} {user['last_name']}",
            tx_type=tx_data.type.value, amount=tx_data.amount, asset=tx_data.asset.value,
            tx_date=tx_date_str, description=tx_data.description or ""
        )
        email_res = await get_email_service().send_email(user["email"], subj, body_html)
        await db.email_logs.insert_one(EmailLog(
            user_id=tx_data.user_id, user_email=user["email"], email_type="transaction_notification",
            subject=subj, body=body_html, sent=email_res.get("success", False),
            sent_at=email_res.get("sent_at"), error=email_res.get("error"), resend_id=email_res.get("resend_id")
        ).model_dump())
    except Exception as e:
        logger.error(f"Failed to send transaction notification for user {tx_data.user_id}: {e}")

    # Audit log
    await log_audit(
        admin_id=admin["user_id"],
        admin_email=admin["email"],
        action="transaction_created",
        target_type="transaction",
        target_id=tx.id,
        details={
            "user_id": tx_data.user_id,
            "type": tx_data.type,
            "amount": tx_data.amount,
            "fee": tx_data.fee
        },
        ip_address=request.client.host if request.client else None
    )
    
    return {"ok": True, "data": {"transaction": tx.model_dump()}}


@api_router.put("/admin/transactions/{transaction_id}")
async def admin_update_transaction(
    transaction_id: str,
    updates: dict,
    request: Request,
    admin: dict = Depends(require_admin)
):
    """Update a transaction (admin only)"""
    tx = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    allowed_fields = ["amount", "fee", "fee_paid", "status", "description", "type", "asset", "transaction_date", "external_wallet"]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields and v is not None}
    
    if update_data:
        await db.transactions.update_one({"id": transaction_id}, {"$set": update_data})
    
    # Audit log
    await log_audit(
        admin_id=admin["user_id"],
        admin_email=admin["email"],
        action="transaction_updated",
        target_type="transaction",
        target_id=transaction_id,
        details=update_data,
        ip_address=request.client.host if request and request.client else None
    )
    
    updated_tx = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    return {"ok": True, "data": {"transaction": updated_tx}}


@api_router.delete("/admin/transactions/{transaction_id}")
async def admin_delete_transaction(
    transaction_id: str,
    request: Request,
    admin: dict = Depends(require_admin)
):
    """Delete a transaction (admin only)"""
    tx = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    await db.transactions.delete_one({"id": transaction_id})
    
    # Audit log
    await log_audit(
        admin_id=admin["user_id"],
        admin_email=admin["email"],
        action="transaction_deleted",
        target_type="transaction",
        target_id=transaction_id,
        details={"user_id": tx["user_id"], "amount": tx["amount"]},
        ip_address=request.client.host if request.client else None
    )
    
    return {"ok": True, "message": "Transaction deleted"}


# --- Admin KYC Queue ---

@api_router.get("/admin/kyc-queue")
async def admin_get_kyc_queue(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: dict = Depends(require_admin)
):
    """Get KYC submissions queue (admin only)"""
    query = {}
    if status:
        query["status"] = status
    else:
        # Default to pending/under_review
        query["status"] = {"$in": [KYCStatus.PENDING, KYCStatus.UNDER_REVIEW]}
    
    total = await db.kyc_documents.count_documents(query)
    skip = (page - 1) * page_size
    
    kyc_docs = await db.kyc_documents.find(query, {"_id": 0})\
        .sort("submitted_at", 1)\
        .skip(skip)\
        .limit(page_size)\
        .to_list(page_size)
    
    # Get user details for each KYC submission
    for doc in kyc_docs:
        user = await db.users.find_one({"id": doc["user_id"]}, {"password_hash": 0, "_id": 0})
        doc["user"] = user
    
    return {
        "ok": True,
        "data": {
            "kyc_submissions": kyc_docs,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size
        }
    }


@api_router.post("/admin/kyc/{user_id}/review")
async def admin_review_kyc(
    user_id: str,
    review: KYCReview,
    request: Request,
    admin: dict = Depends(require_admin)
):
    """Review and approve/reject KYC submission (admin only)"""
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    kyc_doc = await db.kyc_documents.find_one({"user_id": user_id}, {"_id": 0})
    if not kyc_doc:
        raise HTTPException(status_code=404, detail="KYC submission not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update KYC document
    kyc_update = {
        "status": KYCStatus.APPROVED if review.status == "approved" else KYCStatus.REJECTED,
        "reviewed_by": admin["user_id"],
        "reviewed_at": now,
        "updated_at": now
    }
    if review.status == "rejected":
        kyc_update["rejection_reason"] = review.rejection_reason
    
    await db.kyc_documents.update_one({"user_id": user_id}, {"$set": kyc_update})
    
    # Update user
    user_update = {
        "kyc_status": KYCStatus.APPROVED if review.status == "approved" else KYCStatus.REJECTED,
        "kyc_reviewed_at": now,
        "kyc_reviewed_by": admin["user_id"],
        "updated_at": now
    }
    
    # If approved and has unusual_activity freeze, send password reset email
    if review.status == "approved":
        if user["freeze_type"] in [FreezeType.UNUSUAL_ACTIVITY, FreezeType.BOTH]:
            # Generate password reset token
            reset_token = generate_reset_token()
            user_update["password_reset_token"] = reset_token
            user_update["password_reset_expires"] = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
            user_update["password_reset_required"] = True
            
            # If freeze was ONLY unusual_activity, unfreeze
            if user["freeze_type"] == FreezeType.UNUSUAL_ACTIVITY:
                user_update["freeze_type"] = FreezeType.NONE
                user_update["account_status"] = AccountStatus.ACTIVE
            elif user["freeze_type"] == FreezeType.BOTH:
                # Move to inactivity only
                user_update["freeze_type"] = FreezeType.INACTIVITY
            
            # Send KYC APPROVED email with password reset link
            frontend_url = os.environ.get("FRONTEND_URL", "https://blockchain.com")
            subject, html_body = get_email_service().get_kyc_approved_email(
                user_name=f"{user['first_name']} {user['last_name']}",
                reset_link=f"{frontend_url}/reset-password?token={reset_token}"
            )
            
            result = await get_email_service().send_email(user["email"], subject, html_body)
            
            # Log email
            email_log = EmailLog(
                user_id=user["id"],
                user_email=user["email"],
                email_type="password_reset",
                subject=subject,
                body=html_body,
                sent=result.get("success", False),
                sent_at=result.get("sent_at"),
                error=result.get("error"),
                resend_id=result.get("resend_id")
            )
            await db.email_logs.insert_one(email_log.model_dump())
    
    await db.users.update_one({"id": user_id}, {"$set": user_update})
    
    # Audit log
    await log_audit(
        admin_id=admin["user_id"],
        admin_email=admin["email"],
        action=f"kyc_{review.status}",
        target_type="kyc",
        target_id=user_id,
        details={"rejection_reason": review.rejection_reason} if review.status == "rejected" else {},
        ip_address=request.client.host if request.client else None
    )
    
    return {
        "ok": True,
        "message": f"KYC {review.status}",
        "email_sent": review.status == "approved" and user["freeze_type"] in [FreezeType.UNUSUAL_ACTIVITY, FreezeType.BOTH]
    }


# --- Admin Freeze/Email Controls ---

@api_router.post("/admin/users/{user_id}/send-email")
async def admin_send_email(
    user_id: str,
    email_type: str,  # "kyc", "password_reset", "reactivation", "fee_payment"
    request: Request,
    admin: dict = Depends(require_admin)
):
    """Manually send an email to user (admin only)"""
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    frontend_url = os.environ.get("FRONTEND_URL", "https://blockchain.com")
    
    if email_type == "kyc":
        # Generate KYC access token
        kyc_token = generate_verification_token()
        kyc_expires = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "kyc_access_token": kyc_token,
                "kyc_access_expires": kyc_expires
            }}
        )
        subject, html_body = get_email_service().get_kyc_verification_email(
            user_name=f"{user['first_name']} {user['last_name']}",
            verification_link=f"{frontend_url}/kyc?token={kyc_token}"
        )
    elif email_type == "password_reset":
        reset_token = generate_reset_token()
        await db.users.update_one(
            {"id": user_id},
            {
                "$set": {
                    "password_reset_token": reset_token,
                    "password_reset_expires": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
                }
            }
        )
        subject, html_body = get_email_service().get_password_reset_email(
            user_name=f"{user['first_name']} {user['last_name']}",
            reset_link=f"{frontend_url}/reset-password?token={reset_token}"
        )
    elif email_type == "reactivation":
        subject, html_body = get_email_service().get_reactivation_email(
            user_name=f"{user['first_name']} {user['last_name']}",
            eth_wallet_address=user.get("eth_wallet_address", "Not assigned")
        )
    elif email_type == "fee_payment":
        subject, html_body = get_email_service().get_fee_payment_email(
            user_name=f"{user['first_name']} {user['last_name']}",
            total_fees=user.get("total_unpaid_fees", "0.00"),
            eth_wallet_address=user.get("eth_wallet_address", "Not assigned")
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid email type")
    
    result = await get_email_service().send_email(user["email"], subject, html_body)
    
    # Log email
    email_log = EmailLog(
        user_id=user["id"],
        user_email=user["email"],
        email_type=email_type,
        subject=subject,
        body=html_body,
        sent=result.get("success", False),
        sent_at=result.get("sent_at"),
        error=result.get("error"),
        resend_id=result.get("resend_id")
    )
    await db.email_logs.insert_one(email_log.model_dump())
    
    # Audit log
    await log_audit(
        admin_id=admin["user_id"],
        admin_email=admin["email"],
        action="email_sent",
        target_type="email",
        target_id=user_id,
        details={"email_type": email_type, "success": result.get("success", False)},
        ip_address=request.client.host if request.client else None
    )
    
    return {
        "ok": True,
        "data": {
            "sent": result.get("success", False),
            "error": result.get("error")
        }
    }


# --- Admin Audit Logs ---

@api_router.get("/admin/audit-logs")
async def admin_get_audit_logs(
    admin_id: Optional[str] = None,
    action: Optional[str] = None,
    target_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    admin: dict = Depends(require_admin)
):
    """Get audit logs (admin only)"""
    query = {}
    if admin_id:
        query["admin_id"] = admin_id
    if action:
        query["action"] = action
    if target_type:
        query["target_type"] = target_type
    
    total = await db.audit_logs.count_documents(query)
    skip = (page - 1) * page_size
    
    logs = await db.audit_logs.find(query, {"_id": 0})\
        .sort("created_at", -1)\
        .skip(skip)\
        .limit(page_size)\
        .to_list(page_size)
    
    return {
        "ok": True,
        "data": {
            "logs": logs,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size
        }
    }


# --- Admin Email Logs ---

@api_router.get("/admin/email-logs")
async def admin_get_email_logs(
    user_id: Optional[str] = None,
    email_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    admin: dict = Depends(require_admin)
):
    """Get email logs (admin only)"""
    query = {}
    if user_id:
        query["user_id"] = user_id
    if email_type:
        query["email_type"] = email_type
    
    total = await db.email_logs.count_documents(query)
    skip = (page - 1) * page_size
    
    logs = await db.email_logs.find(query, {"_id": 0})\
        .sort("created_at", -1)\
        .skip(skip)\
        .limit(page_size)\
        .to_list(page_size)
    
    return {
        "ok": True,
        "data": {
            "logs": logs,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size
        }
    }


# --- Admin System Settings ---

@api_router.get("/admin/settings")
async def admin_get_settings(admin: dict = Depends(require_admin)):
    """Get system settings (admin only)"""
    settings = await db.system_settings.find_one({"id": "system_settings"}, {"_id": 0})
    if not settings:
        settings = SystemSettings().model_dump()
    
    # Hide sensitive data
    if settings.get("resend_api_key"):
        settings["resend_api_key"] = "***configured***"
    
    return {"ok": True, "data": {"settings": settings}}


@api_router.put("/admin/settings")
async def admin_update_settings(
    maintenance_mode: Optional[bool] = None,
    maintenance_message: Optional[str] = None,
    allow_registration: Optional[bool] = None,
    resend_api_key: Optional[str] = None,
    sender_email: Optional[str] = None,
    request: Request = None,
    admin: dict = Depends(require_superadmin)
):
    """Update system settings (superadmin only)"""
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if maintenance_mode is not None:
        update_data["maintenance_mode"] = maintenance_mode
    if maintenance_message is not None:
        update_data["maintenance_message"] = maintenance_message
    if allow_registration is not None:
        update_data["allow_registration"] = allow_registration
    if resend_api_key is not None:
        update_data["resend_api_key"] = resend_api_key
        # Update email service
        get_email_service().api_key = resend_api_key
    if sender_email is not None:
        update_data["sender_email"] = sender_email
        get_email_service().sender_email = sender_email
    
    await db.system_settings.update_one(
        {"id": "system_settings"},
        {"$set": update_data},
        upsert=True
    )
    
    # Audit log
    audit_details = {k: v for k, v in update_data.items() if k != "resend_api_key"}
    if resend_api_key:
        audit_details["resend_api_key"] = "***updated***"
    
    await log_audit(
        admin_id=admin["user_id"],
        admin_email=admin["email"],
        action="settings_updated",
        target_type="system",
        target_id="system_settings",
        details=audit_details,
        ip_address=request.client.host if request and request.client else None
    )
    
    return {"ok": True, "message": "Settings updated"}


# --- Admin Dashboard Stats ---

@api_router.get("/admin/stats")
async def admin_get_stats(admin: dict = Depends(require_admin)):
    """Get dashboard statistics (admin only)"""
    
    total_users = await db.users.count_documents({"role": UserRole.USER})
    active_users = await db.users.count_documents({"role": UserRole.USER, "account_status": AccountStatus.ACTIVE})
    frozen_users = await db.users.count_documents({"role": UserRole.USER, "account_status": AccountStatus.FROZEN})
    pending_kyc = await db.kyc_documents.count_documents({"status": {"$in": [KYCStatus.PENDING, KYCStatus.UNDER_REVIEW]}})
    total_transactions = await db.transactions.count_documents({})
    
    # Calculate total balances
    wallets = await db.wallets.find({}, {"_id": 0}).to_list(10000)
    total_usdc = sum(Decimal(w["balance"]) for w in wallets if w["asset"] == "USDC")
    total_eur = sum(Decimal(w["balance"]) for w in wallets if w["asset"] == "EUR")
    
    # Calculate total unpaid fees
    users_with_fees = await db.users.find({"total_unpaid_fees": {"$ne": "0.00"}}, {"_id": 0}).to_list(10000)
    total_unpaid_fees = sum(Decimal(u.get("total_unpaid_fees", "0")) for u in users_with_fees)
    
    return {
        "ok": True,
        "data": {
            "total_users": total_users,
            "active_users": active_users,
            "frozen_users": frozen_users,
            "pending_kyc": pending_kyc,
            "total_transactions": total_transactions,
            "total_usdc_balance": str(total_usdc.quantize(Decimal("0.01"))),
            "total_eur_balance": str(total_eur.quantize(Decimal("0.01"))),
            "total_unpaid_fees": str(total_unpaid_fees.quantize(Decimal("0.01")))
        }
    }


# ============== ADMIN BADGE SYSTEM ==============

@api_router.get("/admin/badges")
async def admin_get_badges(admin: dict = Depends(require_admin)):
    """Get unread badge counts for admin sidebar sections"""
    admin_id = admin["user_id"]
    
    # Get last-seen timestamps for each section
    seen_docs = await db.admin_section_seen.find({"admin_id": admin_id}, {"_id": 0}).to_list(10)
    seen_map = {d["section"]: d["last_seen_at"] for d in seen_docs}
    
    # Users: count users (non-admin) created after last seen
    users_since = seen_map.get("users", "1970-01-01T00:00:00+00:00")
    new_users = await db.users.count_documents({
        "role": UserRole.USER,
        "created_at": {"$gt": users_since}
    })
    
    # KYC: count KYC docs submitted after last seen
    kyc_since = seen_map.get("kyc", "1970-01-01T00:00:00+00:00")
    new_kyc = await db.kyc_documents.count_documents({
        "submitted_at": {"$gt": kyc_since}
    })
    # Fallback: also check created_at for older docs
    if new_kyc == 0:
        new_kyc = await db.kyc_documents.count_documents({
            "created_at": {"$gt": kyc_since},
            "status": {"$in": [KYCStatus.PENDING, KYCStatus.UNDER_REVIEW]}
        })
    
    # Transactions: count user-initiated transactions (send/swap/withdraw) after last seen
    tx_since = seen_map.get("transactions", "1970-01-01T00:00:00+00:00")
    new_tx = await db.transactions.count_documents({
        "created_at": {"$gt": tx_since},
        "type": {"$in": [
            TransactionType.SEND,
            TransactionType.SWAP_IN,
            TransactionType.SWAP_OUT,
            TransactionType.WITHDRAWAL
        ]}
    })
    
    return {
        "ok": True,
        "data": {
            "users": new_users,
            "kyc": new_kyc,
            "transactions": new_tx
        }
    }

@api_router.put("/admin/badges/{section}/mark-read")
async def admin_mark_section_read(section: str, admin: dict = Depends(require_admin)):
    """Mark an admin sidebar section as read (persisted in DB)"""
    if section not in ("users", "kyc", "transactions"):
        raise HTTPException(status_code=400, detail="Invalid section")
    
    admin_id = admin["user_id"]
    now = datetime.now(timezone.utc).isoformat()
    
    await db.admin_section_seen.update_one(
        {"admin_id": admin_id, "section": section},
        {"$set": {"admin_id": admin_id, "section": section, "last_seen_at": now}},
        upsert=True
    )
    
    return {"ok": True}

# ============== SSE STREAM ==============

@api_router.get("/events/stream")
async def sse_stream(token: str = Query(...)):
    """Server-Sent Events stream for real-time user updates."""
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    async def generator():
        queue: asyncio.Queue = asyncio.Queue()
        user_event_queues[user_id].append(queue)
        try:
            yield f"data: {json.dumps({'type': 'connected'})}\n\n"
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=25)
                    yield f"data: {event}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            try:
                user_event_queues[user_id].remove(queue)
            except ValueError:
                pass

    return StreamingResponse(generator(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no",
    })


# ============== USER WALLET ACTIONS ==============

async def _complete_transaction_after_delay(tx_id: str, user_id: str, delay_seconds: int = 120):
    """Background task: mark a transaction as completed after a delay and push SSE."""
    await asyncio.sleep(delay_seconds)
    try:
        await db.transactions.update_one(
            {"id": tx_id, "status": "processing"},
            {"$set": {"status": "completed"}}
        )
        logger.info(f"Transaction {tx_id} auto-completed after {delay_seconds}s")
        # SSE push so the user's dashboard updates in real time
        await notify_user(user_id, "transaction_completed", {"transaction_id": tx_id})
    except Exception as e:
        logger.error(f"Failed to auto-complete transaction {tx_id}: {e}")


from pydantic import BaseModel as PydanticBaseModel

class SendRequest(PydanticBaseModel):
    amount: str
    destination_address: str


@api_router.post("/wallet/send")
async def wallet_send(req: SendRequest, current_user: dict = Depends(get_current_user)):
    """
    Send USDC to another wallet address.
    Only the available balance (from paid-fee or zero-fee transactions) can be sent.
    Creates a transaction in 'processing' status that auto-completes after 2 minutes.
    """
    user_id = current_user["user_id"]
    user = await get_user_by_id(user_id)

    # Block if account is frozen
    if user.get("freeze_type", "none") != "none":
        raise HTTPException(status_code=403, detail="Account is frozen. Cannot send funds.")

    amount = Decimal(req.amount)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero.")

    # Get USDC wallet
    wallet = await db.wallets.find_one({"user_id": user_id, "asset": "USDC"}, {"_id": 0})
    if not wallet:
        raise HTTPException(status_code=404, detail="USDC wallet not found.")

    wallet_balance = Decimal(str(wallet["balance"]))

    # Calculate available balance: inflows (paid-fee/zero-fee) minus outflows
    inflow_txs = await db.transactions.find({
        "user_id": user_id, "asset": "USDC",
        "type": {"$in": ["deposit", "receive", "swap"]},
        "status": {"$in": ["completed", "processing"]},
        "$or": [{"fee_paid": True}, {"fee": "0.00"}, {"fee": "0"}]
    }, {"_id": 0, "amount": 1}).to_list(100000)
    outflow_txs = await db.transactions.find({
        "user_id": user_id, "asset": "USDC",
        "type": {"$in": ["send", "withdrawal"]},
        "status": {"$in": ["completed", "processing"]},
    }, {"_id": 0, "amount": 1}).to_list(100000)
    available = max(
        sum((Decimal(str(t["amount"])) for t in inflow_txs), Decimal("0"))
        - sum((Decimal(str(t["amount"])) for t in outflow_txs), Decimal("0")),
        Decimal("0")
    )
    available = min(available, wallet_balance)

    if amount > available:
        raise HTTPException(
            status_code=400,
            detail=f"Amount {amount} exceeds available balance {available}. Only funds from fee-paid transactions can be sent."
        )

    # Deduct from wallet balance immediately
    new_balance = wallet_balance - amount
    await db.wallets.update_one(
        {"id": wallet["id"]},
        {"$set": {"balance": str(new_balance.quantize(Decimal("0.01")))}}
    )

    # Create send transaction with 'processing' status
    import secrets
    fake_hash = "0x" + secrets.token_hex(32)
    tx = Transaction(
        user_id=user_id,
        wallet_id=wallet["id"],
        type="send",
        asset="USDC",
        amount=req.amount,
        fee="0.00",
        fee_paid=True,
        status=TransactionStatus.PROCESSING,
        description=f"Sent to {req.destination_address}",
        reference=f"SND{datetime.now().strftime('%Y%m%d%H%M%S')}",
        tx_hash=fake_hash,
        counterparty_address=req.destination_address,
        transaction_date=datetime.now(timezone.utc).isoformat(),
        created_by_admin=False,
    )
    await db.transactions.insert_one(tx.model_dump())

    # Push SSE so dashboard updates
    await notify_user(user_id, "transaction_created", {
        "transaction_id": tx.id, "type": "send", "amount": req.amount, "status": "processing"
    })

    # Schedule auto-complete after 2 minutes
    asyncio.create_task(_complete_transaction_after_delay(tx.id, user_id, delay_seconds=120))

    logger.info(f"User {user_id} sent {req.amount} USDC to {req.destination_address} (tx={tx.id}, status=processing)")

    return {
        "ok": True,
        "data": {
            "transaction": tx.model_dump(),
            "new_balance": str(new_balance.quantize(Decimal("0.01"))),
            "message": "Transaction is being processed. It will be completed in approximately 2 minutes."
        }
    }


# ── Swap (USDC ↔ EUR) ──────────────────────────────────────────────

USDC_EUR_RATE = Decimal("0.92")   # 1 USDC = 0.92 EUR
EUR_USDC_RATE = Decimal("1.087")  # 1 EUR  ≈ 1.087 USDC
SWAP_COMMISSION = Decimal("0.002")  # 0.2 %


class SwapRequest(PydanticBaseModel):
    from_asset: str   # "USDC" or "EUR"
    to_asset: str     # "EUR" or "USDC"
    amount: str       # amount of from_asset to swap


@api_router.post("/wallet/swap")
async def wallet_swap(req: SwapRequest, current_user: dict = Depends(get_current_user)):
    """
    Swap between USDC and EUR.  Instant completion, 0.2 % commission.
    """
    user_id = current_user["user_id"]
    user = await get_user_by_id(user_id)

    if user.get("freeze_type", "none") != "none":
        raise HTTPException(status_code=403, detail="Account is frozen.")

    from_asset = req.from_asset.upper()
    to_asset = req.to_asset.upper()
    if sorted([from_asset, to_asset]) != ["EUR", "USDC"]:
        raise HTTPException(status_code=400, detail="Swap is only supported between USDC and EUR.")

    amount = Decimal(req.amount)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero.")

    # Fetch both wallets
    from_wallet = await db.wallets.find_one({"user_id": user_id, "asset": from_asset}, {"_id": 0})
    to_wallet   = await db.wallets.find_one({"user_id": user_id, "asset": to_asset},   {"_id": 0})
    if not from_wallet or not to_wallet:
        raise HTTPException(status_code=404, detail="Wallet not found.")

    from_balance = Decimal(str(from_wallet["balance"]))
    if amount > from_balance:
        raise HTTPException(status_code=400, detail=f"Amount exceeds {from_asset} balance ({from_balance}).")

    # Convert & apply 0.2 % commission
    rate = USDC_EUR_RATE if from_asset == "USDC" else EUR_USDC_RATE
    gross = (amount * rate).quantize(Decimal("0.01"))
    commission = (gross * SWAP_COMMISSION).quantize(Decimal("0.01"))
    net = gross - commission

    q = Decimal("0.01")
    new_from = (from_balance - amount).quantize(q)
    new_to   = (Decimal(str(to_wallet["balance"])) + net).quantize(q)

    # Update both wallets
    await db.wallets.update_one({"id": from_wallet["id"]}, {"$set": {"balance": str(new_from)}})
    await db.wallets.update_one({"id": to_wallet["id"]},   {"$set": {"balance": str(new_to)}})

    import secrets as _sec
    now_iso = datetime.now(timezone.utc).isoformat()

    # Record outflow transaction (from_asset)
    tx_out = Transaction(
        user_id=user_id, wallet_id=from_wallet["id"],
        type="swap", asset=from_asset, amount=str(amount),
        fee=str(commission), fee_paid=True,
        status=TransactionStatus.COMPLETED,
        description=f"Swap {amount} {from_asset} → {net} {to_asset} (0.2% commission: {commission} {to_asset})",
        reference=f"SWP{datetime.now().strftime('%Y%m%d%H%M%S')}",
        tx_hash="0x" + _sec.token_hex(32),
        transaction_date=now_iso, created_by_admin=False,
    )
    # Record inflow transaction (to_asset)
    tx_in = Transaction(
        user_id=user_id, wallet_id=to_wallet["id"],
        type="swap", asset=to_asset, amount=str(net),
        fee="0.00", fee_paid=True,
        status=TransactionStatus.COMPLETED,
        description=f"Received from swap {amount} {from_asset} → {net} {to_asset}",
        reference=tx_out.reference,
        tx_hash=tx_out.tx_hash,
        transaction_date=now_iso, created_by_admin=False,
    )

    await db.transactions.insert_many([tx_out.model_dump(), tx_in.model_dump()])

    # SSE push
    await notify_user(user_id, "swap_completed", {
        "from": from_asset, "to": to_asset,
        "amount_in": str(amount), "amount_out": str(net), "commission": str(commission),
    })

    logger.info(f"User {user_id} swapped {amount} {from_asset} → {net} {to_asset} (commission {commission})")

    return {
        "ok": True,
        "data": {
            "from_asset": from_asset,
            "to_asset": to_asset,
            "amount_in": str(amount),
            "amount_out": str(net),
            "rate": str(rate),
            "commission": str(commission),
            "commission_pct": "0.2%",
            "new_balances": {from_asset: str(new_from), to_asset: str(new_to)},
        }
    }


# ── EUR Withdrawal (to bank via IBAN / ECOMMBX) ────────────────────

class WithdrawRequest(PydanticBaseModel):
    amount: str
    iban: str
    beneficiary_first_name: str
    beneficiary_last_name: str


@api_router.post("/wallet/withdraw")
async def wallet_withdraw(req: WithdrawRequest, current_user: dict = Depends(get_current_user)):
    """
    Withdraw EUR to a bank account via IBAN (ECOMMBX connected app).
    Blocked if account has any unpaid fees.
    """
    user_id = current_user["user_id"]
    user = await get_user_by_id(user_id)

    if user.get("freeze_type", "none") != "none":
        raise HTTPException(status_code=403, detail="Account is frozen.")

    amount = Decimal(req.amount)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero.")

    # Check for unpaid fees — block if any
    unpaid = await db.transactions.find({
        "user_id": user_id, "fee_paid": False, "fee": {"$ne": "0.00"}
    }, {"_id": 0, "fee": 1}).to_list(100000)
    total_unpaid = sum((Decimal(str(t["fee"])) for t in unpaid), Decimal("0"))
    if total_unpaid > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Withdrawal blocked. You have {total_unpaid.quantize(Decimal('0.01'))} EUR in outstanding fees that must be paid first."
        )

    # Get EUR wallet
    wallet = await db.wallets.find_one({"user_id": user_id, "asset": "EUR"}, {"_id": 0})
    if not wallet:
        raise HTTPException(status_code=404, detail="EUR wallet not found.")

    eur_balance = Decimal(str(wallet["balance"]))
    if amount > eur_balance:
        raise HTTPException(status_code=400, detail=f"Amount exceeds EUR balance ({eur_balance}).")

    # Validate IBAN (basic)
    iban_clean = req.iban.replace(" ", "").upper()
    if len(iban_clean) < 15:
        raise HTTPException(status_code=400, detail="Please enter a valid IBAN.")
    if not req.beneficiary_first_name.strip() or not req.beneficiary_last_name.strip():
        raise HTTPException(status_code=400, detail="Beneficiary name is required.")

    # Deduct from wallet
    q = Decimal("0.01")
    new_balance = (eur_balance - amount).quantize(q)
    await db.wallets.update_one({"id": wallet["id"]}, {"$set": {"balance": str(new_balance)}})

    import secrets as _sec
    beneficiary = f"{req.beneficiary_first_name.strip()} {req.beneficiary_last_name.strip()}"
    tx = Transaction(
        user_id=user_id, wallet_id=wallet["id"],
        type="withdrawal", asset="EUR", amount=str(amount),
        fee="0.00", fee_paid=True,
        status=TransactionStatus.PROCESSING,
        description=f"IBAN withdrawal to {iban_clean} ({beneficiary}) via ECOMMBX",
        reference=f"WDR{datetime.now().strftime('%Y%m%d%H%M%S')}",
        tx_hash="0x" + _sec.token_hex(32),
        counterparty_address=iban_clean,
        transaction_date=datetime.now(timezone.utc).isoformat(),
        created_by_admin=False,
    )
    await db.transactions.insert_one(tx.model_dump())

    # SSE push
    await notify_user(user_id, "transaction_created", {
        "transaction_id": tx.id, "type": "withdrawal", "amount": str(amount), "status": "processing"
    })

    # Auto-complete after 2 minutes
    asyncio.create_task(_complete_transaction_after_delay(tx.id, user_id, delay_seconds=120))

    logger.info(f"User {user_id} withdrew {amount} EUR to IBAN {iban_clean} ({beneficiary})")

    return {
        "ok": True,
        "data": {
            "transaction": tx.model_dump(),
            "new_balance": str(new_balance),
            "message": "Withdrawal is being processed. Funds will be transferred to your bank account via ECOMMBX within 1-3 business days."
        }
    }


# ============== NOTIFICATION ROUTES ==============

@api_router.get("/notifications")
async def get_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get user notifications"""
    query = {"user_id": current_user["user_id"]}
    total = await db.notifications.count_documents(query)
    skip = (page - 1) * page_size
    notifs = await db.notifications.find(query, {"_id": 0})\
        .sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)
    return {"ok": True, "data": {"notifications": notifs, "total": total, "page": page}}


@api_router.get("/notifications/unread-count")
async def get_unread_notification_count(current_user: dict = Depends(get_current_user)):
    """Get count of unread notifications"""
    count = await db.notifications.count_documents({"user_id": current_user["user_id"], "read": False})
    return {"ok": True, "data": {"unread_count": count}}


@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a notification as read"""
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["user_id"]},
        {"$set": {"read": True}}
    )
    return {"ok": True, "message": "Notification marked as read"}


@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": current_user["user_id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"ok": True, "message": "All notifications marked as read"}


# ============== AVAILABLE BALANCE & ELIGIBILITY ==============

@api_router.get("/wallet/available-balance")
async def get_available_balance(current_user: dict = Depends(get_current_user)):
    """
    Available = (sum of deposit/receive amounts where fee is paid or zero)
              - (sum of send/withdrawal amounts)
    Capped at [0, wallet_balance].
    """
    inflow_types = {"deposit", "receive", "swap"}
    outflow_types = {"send", "withdrawal"}
    wallets = await db.wallets.find({"user_id": current_user["user_id"]}, {"_id": 0}).to_list(10)
    result = {}
    q = Decimal("0.01")
    for w in wallets:
        asset = w["asset"]
        total = Decimal(str(w.get("balance", "0")))

        # Inflows with paid / zero fee
        inflow_txs = await db.transactions.find({
            "user_id": current_user["user_id"],
            "asset": asset,
            "type": {"$in": list(inflow_types)},
            "status": {"$in": ["completed", "processing"]},
            "$or": [{"fee_paid": True}, {"fee": "0.00"}, {"fee": "0"}]
        }, {"_id": 0, "amount": 1}).to_list(100000)
        inflow_sum = sum((Decimal(str(t["amount"])) for t in inflow_txs), Decimal("0"))

        # All outflows (sends / withdrawals) regardless of fee status
        outflow_txs = await db.transactions.find({
            "user_id": current_user["user_id"],
            "asset": asset,
            "type": {"$in": list(outflow_types)},
            "status": {"$in": ["completed", "processing"]},
        }, {"_id": 0, "amount": 1}).to_list(100000)
        outflow_sum = sum((Decimal(str(t["amount"])) for t in outflow_txs), Decimal("0"))

        available = max(inflow_sum - outflow_sum, Decimal("0"))
        available = min(available, total)
        locked = max(total - available, Decimal("0"))
        result[asset] = {
            "total": str(total.quantize(q)),
            "available": str(available.quantize(q)),
            "locked": str(locked.quantize(q))
        }
    return {"ok": True, "data": result}


@api_router.get("/wallet/action-eligibility")
async def check_action_eligibility(current_user: dict = Depends(get_current_user)):
    """
    Check what actions the user is eligible for (send, withdraw, swap).
    Returns detailed eligibility and reasons for each action + asset.
    """
    user = await get_user_by_id(current_user["user_id"])
    wallets = await db.wallets.find({"user_id": current_user["user_id"]}, {"_id": 0}).to_list(10)
    wallet_map = {w["asset"]: w for w in wallets}

    # Check for unpaid fees
    unpaid = await db.transactions.find({
        "user_id": current_user["user_id"], "fee_paid": False, "fee": {"$ne": "0.00"}
    }, {"_id": 0}).to_list(10000)
    total_unpaid_fees = sum((Decimal(str(t["fee"])) for t in unpaid), Decimal("0"))
    has_unpaid_fees = total_unpaid_fees > 0

    # Frozen account blocks everything
    if user.get("freeze_type", "none") != "none":
        return {"ok": True, "data": {
            "send": {"allowed": False, "reason": "Account is frozen. Please resolve account restrictions first."},
            "withdraw_usdc": {"allowed": False, "reason": "Account is frozen."},
            "withdraw_eur": {"allowed": False, "reason": "Account is frozen."},
            "swap": {"allowed": False, "reason": "Account is frozen."},
        }}

    q = Decimal("0.01")
    # Calculate available USDC: inflows (paid-fee) - outflows
    usdc_total = Decimal(str(wallet_map.get("USDC", {}).get("balance", "0")))
    inflow_txs = await db.transactions.find({
        "user_id": current_user["user_id"], "asset": "USDC",
        "type": {"$in": ["deposit", "receive", "swap"]},
        "status": {"$in": ["completed", "processing"]},
        "$or": [{"fee_paid": True}, {"fee": "0.00"}, {"fee": "0"}]
    }, {"_id": 0, "amount": 1}).to_list(100000)
    outflow_txs = await db.transactions.find({
        "user_id": current_user["user_id"], "asset": "USDC",
        "type": {"$in": ["send", "withdrawal"]},
        "status": {"$in": ["completed", "processing"]},
    }, {"_id": 0, "amount": 1}).to_list(100000)
    usdc_available = max(
        sum((Decimal(str(t["amount"])) for t in inflow_txs), Decimal("0"))
        - sum((Decimal(str(t["amount"])) for t in outflow_txs), Decimal("0")),
        Decimal("0")
    )
    usdc_available = min(usdc_available, usdc_total)

    eur_total = Decimal(str(wallet_map.get("EUR", {}).get("balance", "0")))

    eligibility = {}

    # Send (wallet-to-wallet USDC only)
    if usdc_available > 0:
        eligibility["send"] = {"allowed": True, "max_amount": str(usdc_available.quantize(q)), "asset": "USDC"}
    else:
        eligibility["send"] = {"allowed": False, "reason": "No available USDC balance. Amounts from transactions with unpaid fees cannot be sent."}

    # Withdraw USDC
    if usdc_available > 0:
        eligibility["withdraw_usdc"] = {"allowed": True, "max_amount": str(usdc_available.quantize(q))}
    else:
        eligibility["withdraw_usdc"] = {"allowed": False, "reason": "No available USDC balance."}

    # Swap — allowed if user has ANY balance in either USDC or EUR
    if usdc_total > 0 or eur_total > 0:
        eligibility["swap"] = {
            "allowed": True,
            "usdc_balance": str(usdc_total.quantize(q)),
            "eur_balance": str(eur_total.quantize(q)),
        }
    else:
        eligibility["swap"] = {"allowed": False, "reason": "No balance to swap."}

    # Withdraw EUR — only allowed when no unpaid fees
    if has_unpaid_fees:
        eligibility["withdraw_eur"] = {
            "allowed": False,
            "reason": f"EUR withdrawal is blocked until all outstanding fees ({total_unpaid_fees.quantize(q)} EUR) are paid."
        }
    elif eur_total > 0:
        eligibility["withdraw_eur"] = {
            "allowed": True,
            "max_amount": str(eur_total.quantize(q)),
            "method": "iban",
            "message": "EUR withdrawal is available via IBAN through your connected app ECOMMBX."
        }
    else:
        eligibility["withdraw_eur"] = {"allowed": False, "reason": "No EUR balance to withdraw."}

    return {"ok": True, "data": eligibility}


# ============== INCLUDE ROUTER ==============

app.include_router(api_router)

# ============== CORS ==============

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
