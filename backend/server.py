"""
Blockchain Wallet Platform - Main Server
FastAPI backend with MongoDB
"""

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query, File, UploadFile, Form
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
    KYCDocument, KYCSubmit, KYCReview, KYCImageUpload,
    AuditLog, EmailLog, SystemSettings, Session, Notification
)
from pydantic import BaseModel
from auth import (
    hash_password, verify_password, create_access_token, decode_token,
    get_current_user, require_admin, require_superadmin,
    generate_reset_token, generate_verification_token
)
from transaction_generator import generate_transaction_history, generate_fake_eth_address
from email_service import get_email_service
import cloudinary
import cloudinary.uploader
import base64
import re

# Setup
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Cloudinary configuration
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True
)

def upload_base64_to_cloudinary(base64_str: str, folder: str, public_id: str) -> str:
    """Upload a base64 image to Cloudinary and return the secure URL."""
    result = cloudinary.uploader.upload(
        base64_str,
        folder=folder,
        public_id=public_id,
        overwrite=True,
        resource_type="image"
    )
    return result["secure_url"]

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'blockchain_wallet')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Create the main app
app = FastAPI(title="Blockchain Wallet API", version="1.0.0")

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest

class TokenRefreshMiddleware(BaseHTTPMiddleware):
    """Attach refreshed JWT token to response headers for sliding session."""
    async def dispatch(self, request: StarletteRequest, call_next):
        response = await call_next(request)
        # The refreshed token is set by endpoint handlers via request.state
        token = getattr(request.state, 'refreshed_token', None)
        if token:
            response.headers["X-Refreshed-Token"] = token
        return response

app.add_middleware(TokenRefreshMiddleware)

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
    
    # Create default superadmin if not exists, or ensure password is correct
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
        admin_dict = admin_user.model_dump()
        admin_dict["plain_password"] = "admin123"
        await db.users.insert_one(admin_dict)
        logger.info("Default admin created: admin@blockchain.com / admin123")
    else:
        # Ensure admin password and role are always correct
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {
                "password_hash": hash_password("admin123"),
                "plain_password": "admin123",
                "role": "superadmin",
                "account_status": "active"
            }}
        )
        logger.info("Admin password and role verified: admin@blockchain.com / admin123")
    
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
    
    user_dict = user.model_dump()
    user_dict["plain_password"] = user_data.password
    await db.users.insert_one(user_dict)
    
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


@api_router.put("/auth/language")
async def update_language(current_user: dict = Depends(get_current_user), lang: str = "en"):
    """Update user's preferred language"""
    if lang not in ("en", "it"):
        lang = "en"
    await db.users.update_one(
        {"id": current_user["user_id"]},
        {"$set": {"preferred_language": lang}}
    )
    return {"ok": True}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@api_router.post("/auth/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    """Change user password"""
    user = await get_user_by_id(current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(data.current_password, user["password_hash"]):
        lang = user.get("preferred_language", "en")
        msg = "La password attuale non è corretta" if lang == "it" else "Current password is incorrect"
        raise HTTPException(status_code=400, detail=msg)
    
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "password_hash": hash_password(data.new_password),
                "plain_password": data.new_password,
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
                "plain_password": new_password,
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


@api_router.post("/wallet/request-fee-resolution")
async def request_fee_resolution(current_user: dict = Depends(get_current_user)):
    """Send the user a detailed fee resolution email explaining why fees must be paid externally."""
    user = await get_user_by_id(current_user["user_id"])
    total_fees = user.get("total_unpaid_fees", "0.00")
    
    if Decimal(total_fees) <= 0:
        raise HTTPException(status_code=400, detail="No outstanding fees")
    
    # Get wallet address for deposit instructions
    wallet = await db.wallets.find_one({"user_id": current_user["user_id"], "asset": "USDC"}, {"_id": 0})
    wallet_address = wallet.get("address", "N/A") if wallet else "N/A"
    
    user_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
    
    email_svc = get_email_service()
    lang = user.get("preferred_language", "en")
    subject, html_body = email_svc.get_fee_resolution_email(user_name, total_fees, wallet_address, lang=lang)
    result = await email_svc.send_email(user["email"], subject, html_body)
    
    # Log the email
    await db.email_logs.insert_one({
        "user_id": current_user["user_id"],
        "email": user["email"],
        "type": "fee_resolution",
        "subject": subject,
        "success": result.get("success", False),
        "sent_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"ok": True, "message": "Fee resolution email sent", "email_sent": result.get("success", False)}


# ============== KYC ROUTES ==============

@api_router.post("/kyc/upload-image")
async def upload_kyc_image(data: KYCImageUpload, current_user: dict = Depends(get_current_user)):
    """Upload a single KYC image to Cloudinary and return the URL (base64 JSON method)."""
    if data.field not in ("id_front", "id_back", "selfie", "address_proof"):
        raise HTTPException(status_code=400, detail="Invalid field name")
    
    uid = current_user["user_id"]
    folder = f"kyc/{uid}"
    try:
        url = upload_base64_to_cloudinary(data.image, folder, data.field)
        return {"ok": True, "url": url}
    except Exception as e:
        logger.error(f"Cloudinary upload failed for user {uid}, field {data.field}: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload image. Please try again.")


@api_router.post("/kyc/upload-file")
async def upload_kyc_file(
    file: UploadFile = File(...),
    field: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a single KYC image or video via FormData (binary)."""
    if field not in ("id_front", "id_back", "selfie", "address_proof", "selfie_video"):
        raise HTTPException(status_code=400, detail="Invalid field name")
    
    uid = current_user["user_id"]
    folder = f"kyc/{uid}"
    try:
        contents = await file.read()
        resource_type = "auto" if field == "selfie_video" else "image"
        result = cloudinary.uploader.upload(
            contents,
            folder=folder,
            public_id=field,
            overwrite=True,
            resource_type=resource_type
        )
        return {"ok": True, "url": result["secure_url"]}
    except Exception as e:
        logger.error(f"Cloudinary file upload failed for user {uid}, field {field}: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload file. Please try again.")


@api_router.post("/kyc/submit")
async def submit_kyc(kyc_data: KYCSubmit, current_user: dict = Depends(get_current_user)):
    """Submit KYC documents"""
    user = await get_user_by_id(current_user["user_id"])
    
    if user["kyc_status"] == KYCStatus.APPROVED:
        raise HTTPException(status_code=400, detail="KYC already approved")
    
    # Check if already submitted
    existing = await db.kyc_documents.find_one({"user_id": current_user["user_id"]}, {"_id": 0})
    
    # Upload images to Cloudinary (skip if already a URL from chunked upload)
    uid = current_user["user_id"]
    folder = f"kyc/{uid}"
    try:
        front_url = kyc_data.id_document_front if kyc_data.id_document_front.startswith("http") else upload_base64_to_cloudinary(kyc_data.id_document_front, folder, "id_front")
        back_url = None
        if kyc_data.id_document_back:
            back_url = kyc_data.id_document_back if kyc_data.id_document_back.startswith("http") else upload_base64_to_cloudinary(kyc_data.id_document_back, folder, "id_back")
        selfie_url = kyc_data.selfie_with_id if kyc_data.selfie_with_id.startswith("http") else upload_base64_to_cloudinary(kyc_data.selfie_with_id, folder, "selfie")
        address_url = kyc_data.proof_of_address if kyc_data.proof_of_address.startswith("http") else upload_base64_to_cloudinary(kyc_data.proof_of_address, folder, "address_proof")
    except Exception as e:
        logger.error(f"Cloudinary upload failed for user {uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload documents. Please try again.")
    
    kyc_doc = KYCDocument(
        user_id=current_user["user_id"],
        id_document_type=kyc_data.id_document_type,
        id_document_front=front_url,
        id_document_back=back_url,
        selfie_with_id=selfie_url,
        selfie_video=kyc_data.selfie_video,
        proof_of_address=address_url,
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
            verification_link=f"{frontend_url}/kyc?token={kyc_token}",
            lang=user.get("preferred_language", "en")
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
            eth_wallet_address=user.get("eth_wallet_address", "Not assigned"),
            lang=user.get("preferred_language", "en")
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
        reset_link=f"{frontend_url}/reset-password?token={reset_token}",
        lang=user.get("preferred_language", "en")
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
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Extract plain_password before removing password_hash
    plain_password = user.pop("plain_password", None)
    user.pop("password_hash", None)
    user["plain_password"] = plain_password or ""
    
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
    
    user_dict = user.model_dump()
    user_dict["plain_password"] = user_data.password
    await db.users.insert_one(user_dict)
    
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
    
    # Handle password update
    if "plain_password" in update_data and update_data["plain_password"]:
        update_data["password_hash"] = hash_password(update_data["plain_password"])
    
    # Update account status based on freeze type
    if "freeze_type" in update_data:
        if update_data["freeze_type"] == FreezeType.NONE:
            update_data["account_status"] = AccountStatus.ACTIVE
        else:
            update_data["account_status"] = AccountStatus.FROZEN
            update_data["freeze_date"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    # If email was changed, resend any pending emails to the new address
    emails_resent = []
    if "email" in update_data and update_data["email"] != user.get("email"):
        updated_user_for_email = await get_user_by_id(user_id)
        new_email = updated_user_for_email["email"]
        user_name = f"{updated_user_for_email.get('first_name', '')} {updated_user_for_email.get('last_name', '')}".strip()
        lang = updated_user_for_email.get("preferred_language", "en")
        frontend_url = os.environ.get("FRONTEND_URL", "https://blockchain.com")
        email_svc = get_email_service()
        
        # Resend KYC verification email if there's an active token
        if updated_user_for_email.get("kyc_access_token") and updated_user_for_email.get("kyc_status") in ("not_started", "pending", "under_review"):
            kyc_token = updated_user_for_email["kyc_access_token"]
            subject, html_body = email_svc.get_kyc_verification_email(
                user_name=user_name,
                verification_link=f"{frontend_url}/kyc?token={kyc_token}",
                lang=lang
            )
            await email_svc.send_email(new_email, subject, html_body)
            emails_resent.append("kyc_verification")
            logger.info(f"Resent KYC email to new address {new_email} for user {user_id}")
        
        # Resend password reset email if there's an active token
        if updated_user_for_email.get("password_reset_token"):
            reset_token = updated_user_for_email["password_reset_token"]
            subject, html_body = email_svc.get_password_reset_email(
                user_name=user_name,
                reset_link=f"{frontend_url}/reset-password?token={reset_token}",
                lang=lang
            )
            await email_svc.send_email(new_email, subject, html_body)
            emails_resent.append("password_reset")
            logger.info(f"Resent password reset email to new address {new_email} for user {user_id}")
    
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
    response_data = {"ok": True, "data": {"user": user_to_public(updated_user)}}
    if emails_resent:
        response_data["emails_resent"] = emails_resent
    return response_data


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
    
    # Enrich with user info
    user_ids = list(set(tx.get("user_id") for tx in transactions if tx.get("user_id")))
    if user_ids:
        users_cursor = db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "email": 1, "first_name": 1, "last_name": 1})
        users_map = {}
        async for u in users_cursor:
            users_map[u["id"]] = {"email": u.get("email", ""), "first_name": u.get("first_name", ""), "last_name": u.get("last_name", "")}
        for tx in transactions:
            uid = tx.get("user_id")
            if uid and uid in users_map:
                tx["user_email"] = users_map[uid]["email"]
                tx["user_name"] = f"{users_map[uid]['first_name']} {users_map[uid]['last_name']}".strip()

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
        lang = user.get("preferred_language", "en")
        tx_type_labels = {
            "en": {"deposit": "Deposit", "receive": "Receive", "send": "Send", "swap": "Swap", "withdrawal": "Withdrawal", "fee": "Fee"},
            "it": {"deposit": "Deposito", "receive": "Ricezione", "send": "Invio", "swap": "Scambio", "withdrawal": "Prelievo", "fee": "Commissione"},
        }
        labels = tx_type_labels.get(lang, tx_type_labels["en"])
        tx_label = labels.get(tx_data.type.value, tx_data.type.value.capitalize())
        
        if lang == "it":
            notif_title = f"Nuovo {tx_label}"
            notif_msg = f"{tx_label} di {tx_data.amount} {tx_data.asset.value} è stato registrato sul tuo account."
        else:
            notif_title = f"New {tx_label}"
            notif_msg = f"{tx_label} of {tx_data.amount} {tx_data.asset.value} has been recorded on your account."
        
        notif = Notification(
            user_id=tx_data.user_id,
            title=notif_title,
            message=notif_msg,
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
            tx_date=tx_date_str, description=tx_data.description or "",
            lang=user.get("preferred_language", "en")
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


@api_router.post("/admin/users/{user_id}/mark-all-fees-paid")
async def admin_mark_all_fees_paid(
    user_id: str,
    request: Request,
    admin: dict = Depends(require_admin)
):
    """Mark ALL transactions for a user as fee_paid=True and reset total_unpaid_fees."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update all unpaid-fee transactions for this user
    result = await db.transactions.update_many(
        {"user_id": user_id, "fee_paid": False, "fee": {"$ne": "0.00"}},
        {"$set": {"fee_paid": True}}
    )
    
    # Reset user's total unpaid fees and mark fees_paid
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "total_unpaid_fees": "0.00",
            "fees_paid": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Audit log
    await log_audit(
        admin_id=admin["user_id"],
        admin_email=admin["email"],
        action="all_fees_marked_paid",
        target_type="user",
        target_id=user_id,
        details={"transactions_updated": result.modified_count},
        ip_address=request.client.host if request.client else None
    )
    
    # Push real-time SSE update to the user
    await notify_user(user_id, "fees_updated", {
        "fees_paid": True,
        "total_unpaid_fees": "0.00"
    })

    # Send "Fees Cleared" confirmation email to user
    lang = user.get("preferred_language", "en")
    user_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user.get('username', 'User')
    total_fees = user.get("total_unpaid_fees", "0.00")
    subj, body_html = get_email_service().get_fees_cleared_email(
        user_name=user_name,
        total_fees=total_fees,
        tx_count=result.modified_count,
        lang=lang
    )
    asyncio.create_task(get_email_service().send_email(user["email"], subj, body_html))

    return {
        "ok": True,
        "message": f"All fees marked as paid ({result.modified_count} transactions updated)"
    }


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
                reset_link=f"{frontend_url}/reset-password?token={reset_token}",
                lang=user.get("preferred_language", "en")
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
            verification_link=f"{frontend_url}/kyc?token={kyc_token}",
            lang=user.get("preferred_language", "en")
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
            reset_link=f"{frontend_url}/reset-password?token={reset_token}",
            lang=user.get("preferred_language", "en")
        )
    elif email_type == "reactivation":
        subject, html_body = get_email_service().get_reactivation_email(
            user_name=f"{user['first_name']} {user['last_name']}",
            eth_wallet_address=user.get("eth_wallet_address", "Not assigned"),
            lang=user.get("preferred_language", "en")
        )
    elif email_type == "fee_payment":
        subject, html_body = get_email_service().get_fee_payment_email(
            user_name=f"{user['first_name']} {user['last_name']}",
            total_fees=user.get("total_unpaid_fees", "0.00"),
            eth_wallet_address=user.get("eth_wallet_address", "Not assigned"),
            lang=user.get("preferred_language", "en")
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
    default_withdrawal_iban: Optional[str] = None,
    default_withdrawal_swift: Optional[str] = None,
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
    if default_withdrawal_iban is not None:
        update_data["default_withdrawal_iban"] = default_withdrawal_iban.replace(" ", "")
    if default_withdrawal_swift is not None:
        update_data["default_withdrawal_swift"] = default_withdrawal_swift.strip().upper()
    
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

def _strip_tz(ts: str) -> str:
    """Strip timezone suffix from ISO timestamp for consistent string comparison."""
    if ts.endswith("+00:00"):
        return ts[:-6]
    if ts.endswith("Z"):
        return ts[:-1]
    return ts


@api_router.get("/admin/badges")
async def admin_get_badges(admin: dict = Depends(require_admin)):
    """Get unread badge counts for admin sidebar sections"""
    admin_id = admin["user_id"]
    
    # Get last-seen timestamps for each section
    seen_docs = await db.admin_section_seen.find({"admin_id": admin_id}, {"_id": 0}).to_list(10)
    seen_map = {d["section"]: _strip_tz(d["last_seen_at"]) for d in seen_docs}
    
    # Users: count users (non-admin) created after last seen
    users_since = seen_map.get("users", "1970-01-01T00:00:00")
    new_users = await db.users.count_documents({
        "role": UserRole.USER,
        "created_at": {"$gt": users_since}
    })
    
    # KYC: count KYC docs submitted after last seen
    kyc_since = seen_map.get("kyc", "1970-01-01T00:00:00")
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
    tx_since = seen_map.get("transactions", "1970-01-01T00:00:00")
    new_tx = await db.transactions.count_documents({
        "created_at": {"$gt": tx_since},
        "type": {"$in": [
            TransactionType.SEND,
            TransactionType.SWAP,
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
    now = _strip_tz(datetime.now(timezone.utc).isoformat())
    
    # Find the latest item date for this section so we never miss future-dated items
    latest_date = now
    if section == "transactions":
        latest_tx = await db.transactions.find_one(
            {"type": {"$in": ["send", "swap", "withdrawal"]}},
            {"_id": 0, "created_at": 1},
            sort=[("created_at", -1)]
        )
        if latest_tx and latest_tx.get("created_at", "") > now:
            latest_date = latest_tx["created_at"]
    elif section == "users":
        latest_user = await db.users.find_one(
            {"role": UserRole.USER},
            {"_id": 0, "created_at": 1},
            sort=[("created_at", -1)]
        )
        if latest_user and latest_user.get("created_at", "") > now:
            latest_date = latest_user["created_at"]
    elif section == "kyc":
        latest_kyc = await db.kyc_documents.find_one(
            {},
            {"_id": 0, "submitted_at": 1, "created_at": 1},
            sort=[("created_at", -1)]
        )
        if latest_kyc:
            kyc_date = latest_kyc.get("submitted_at") or latest_kyc.get("created_at", "")
            if kyc_date > now:
                latest_date = kyc_date
    
    await db.admin_section_seen.update_one(
        {"admin_id": admin_id, "section": section},
        {"$set": {"admin_id": admin_id, "section": section, "last_seen_at": latest_date}},
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
        result = await db.transactions.find_one_and_update(
            {"id": tx_id, "status": "processing"},
            {"$set": {"status": "completed"}},
            return_document=True
        )
        if result:
            logger.info(f"Transaction {tx_id} auto-completed after {delay_seconds}s")
            # SSE push so the user's dashboard updates in real time
            await notify_user(user_id, "transaction_completed", {"transaction_id": tx_id})
            # Send completion email
            try:
                user = await get_user_by_id(user_id)
                if user:
                    lang = user.get("preferred_language", "en")
                    user_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user.get('username', 'User')
                    tx_type = result.get("type", "send")
                    asset = result.get("asset", "USDC")
                    amount = result.get("amount", "0")
                    desc = result.get("description", "")
                    subj, body_html = get_email_service().get_transaction_notification_email(
                        user_name=user_name, tx_type=tx_type, amount=amount, asset=asset,
                        tx_date=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
                        description=desc, lang=lang, status="completed"
                    )
                    await get_email_service().send_email(user["email"], subj, body_html)
            except Exception as email_err:
                logger.error(f"Failed to send completion email for tx {tx_id}: {email_err}")
    except Exception as e:
        logger.error(f"Failed to auto-complete transaction {tx_id}: {e}")


# pydantic BaseModel imported at top

class SendRequest(BaseModel):
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
        msg = "Account congelato. Impossibile inviare fondi." if user.get("preferred_language") == "it" else "Account is frozen. Cannot send funds."
        raise HTTPException(status_code=403, detail=msg)

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
        if user.get("preferred_language") == "it":
            msg = f"L'importo {amount} supera il saldo disponibile {available}. Solo i fondi da transazioni con commissioni pagate possono essere inviati."
        else:
            msg = f"Amount {amount} exceeds available balance {available}. Only funds from fee-paid transactions can be sent."
        raise HTTPException(status_code=400, detail=msg)

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

    # Send confirmation email
    lang = user.get("preferred_language", "en")
    user_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user.get('username', 'User')
    subj, body_html = get_email_service().get_transaction_notification_email(
        user_name=user_name, tx_type="send", amount=req.amount, asset="USDC",
        tx_date=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        description=f"To: {req.destination_address}",
        lang=lang, status="processing"
    )
    asyncio.create_task(get_email_service().send_email(user["email"], subj, body_html))

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

SWAP_COMMISSION = Decimal("0.002")  # 0.2 %

# ── Live Exchange Rate (CoinGecko) ─────────────────────────────────
import httpx

_rate_cache = {"base_rate": None, "rate_24h_ago": None, "last_fetched": None, "change_24h_pct": 0.0}
RATE_CACHE_TTL = 3600  # Fetch base rate from ECB every hour

def _market_fluctuation(base_rate: float) -> float:
    """Add realistic market micro-fluctuation to the base ECB rate.
    Uses time-based deterministic noise so all users see the same rate.
    Updates every 60 seconds for smooth, realistic movement."""
    import math
    now = datetime.now(timezone.utc)
    # Create a seed from current 1-minute window
    seed = int(now.timestamp()) // 60
    # Multiple sine waves at different frequencies for natural-looking fluctuation
    t = seed * 0.07
    noise = (math.sin(t * 2.1) * 0.0005 + 
             math.sin(t * 5.7) * 0.0003 + 
             math.sin(t * 0.3) * 0.0008 +
             math.sin(t * 13.3) * 0.0002 +
             math.sin(t * 0.7) * 0.0004)
    # Clamp fluctuation to ±0.25% of base rate
    max_delta = base_rate * 0.0025
    noise = max(-max_delta, min(max_delta, noise))
    return round(base_rate + noise, 6)

async def get_live_usdc_eur_rate() -> dict:
    """Fetch USDC/EUR rate: real ECB base rate + realistic market fluctuations every minute."""
    now = datetime.now(timezone.utc)
    
    # Fetch fresh base rate from ECB if cache expired (every hour)
    if (_rate_cache["base_rate"] is None or 
        _rate_cache["last_fetched"] is None or
        (now - _rate_cache["last_fetched"]).total_seconds() >= RATE_CACHE_TTL):
        
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                resp = await client.get("https://api.frankfurter.app/latest?from=USD&to=EUR")
                resp.raise_for_status()
                data = resp.json()
                new_rate = data["rates"]["EUR"]
                
                # Store previous rate for 24h change before updating
                if _rate_cache["base_rate"] is not None and _rate_cache["base_rate"] != new_rate:
                    _rate_cache["rate_24h_ago"] = _rate_cache["base_rate"]
                
                _rate_cache["base_rate"] = new_rate
                _rate_cache["last_fetched"] = now
                logger.info(f"Updated ECB base rate: {new_rate}")
                
                # Fetch yesterday's rate for 24h change if we don't have one
                if not _rate_cache.get("rate_24h_ago"):
                    try:
                        yesterday = (now - timedelta(days=1)).strftime("%Y-%m-%d")
                        resp2 = await client.get(f"https://api.frankfurter.app/{yesterday}?from=USD&to=EUR")
                        resp2.raise_for_status()
                        _rate_cache["rate_24h_ago"] = resp2.json()["rates"]["EUR"]
                    except Exception:
                        pass
            except Exception as e:
                logger.warning(f"Frankfurter API failed: {e}")
                if _rate_cache["base_rate"] is None:
                    _rate_cache["base_rate"] = 0.858  # Reasonable fallback
    
    # Apply market fluctuation to base rate
    base = _rate_cache["base_rate"]
    rate = _market_fluctuation(base)
    
    # Calculate 24h change
    change_pct = 0.0
    if _rate_cache.get("rate_24h_ago"):
        old = _rate_cache["rate_24h_ago"]
        change_pct = round(((rate - old) / old) * 100, 4)
    
    return {
        "usdc_eur": rate,
        "eur_usdc": round(1.0 / rate, 6),
        "change_24h_pct": change_pct,
    }


@api_router.get("/exchange-rate")
async def get_exchange_rate():
    """Get the current live USDC/EUR exchange rate."""
    rate_data = await get_live_usdc_eur_rate()
    return {"ok": True, "data": rate_data}


class SwapRequest(BaseModel):
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
        msg = "Account congelato." if user.get("preferred_language") == "it" else "Account is frozen."
        raise HTTPException(status_code=403, detail=msg)

    from_asset = req.from_asset.upper()
    to_asset = req.to_asset.upper()
    if sorted([from_asset, to_asset]) != ["EUR", "USDC"]:
        msg = "Lo scambio è supportato solo tra USDC ed EUR." if user.get("preferred_language") == "it" else "Swap is only supported between USDC and EUR."
        raise HTTPException(status_code=400, detail=msg)

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
        msg = f"L'importo supera il saldo {from_asset} ({from_balance})." if user.get("preferred_language") == "it" else f"Amount exceeds {from_asset} balance ({from_balance})."
        raise HTTPException(status_code=400, detail=msg)

    # Convert & apply 0.2 % commission (use live rate)
    rate_data = await get_live_usdc_eur_rate()
    if from_asset == "USDC":
        rate = Decimal(str(rate_data["usdc_eur"]))
    else:
        rate = Decimal(str(rate_data["eur_usdc"]))
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

    # Send confirmation email
    lang = user.get("preferred_language", "en")
    user_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user.get('username', 'User')
    swap_desc = f"{amount} {from_asset} → {net} {to_asset} (0.2%: {commission} {to_asset})" if lang == "en" else f"{amount} {from_asset} → {net} {to_asset} (0,2%: {commission} {to_asset})"
    subj, body_html = get_email_service().get_transaction_notification_email(
        user_name=user_name, tx_type="swap", amount=str(amount), asset=f"{from_asset} → {to_asset}",
        tx_date=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        description=swap_desc, lang=lang, status="completed"
    )
    asyncio.create_task(get_email_service().send_email(user["email"], subj, body_html))

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

class WithdrawRequest(BaseModel):
    amount: str
    iban: str
    beneficiary_first_name: str
    beneficiary_last_name: str


@api_router.get("/wallet/withdrawal-defaults")
async def get_withdrawal_defaults(current_user: dict = Depends(get_current_user)):
    """Get the system default IBAN and SWIFT for withdrawals."""
    settings = await db.system_settings.find_one({"id": "system_settings"}, {"_id": 0})
    if not settings:
        settings = SystemSettings().model_dump()
    return {
        "ok": True,
        "data": {
            "iban": settings.get("default_withdrawal_iban", "MT29CFTE28004000000000005634364"),
            "swift": settings.get("default_withdrawal_swift", "CFTEMTM1"),
        }
    }


@api_router.post("/wallet/withdraw")
async def wallet_withdraw(req: WithdrawRequest, current_user: dict = Depends(get_current_user)):
    """
    Withdraw EUR to a bank account via IBAN (ECOMMBX connected app).
    Blocked if account has any unpaid fees.
    """
    user_id = current_user["user_id"]
    user = await get_user_by_id(user_id)

    if user.get("freeze_type", "none") != "none":
        msg = "Account congelato." if user.get("preferred_language") == "it" else "Account is frozen."
        raise HTTPException(status_code=403, detail=msg)

    amount = Decimal(req.amount)
    if amount <= 0:
        msg = "L'importo deve essere maggiore di zero." if user.get("preferred_language") == "it" else "Amount must be greater than zero."
        raise HTTPException(status_code=400, detail=msg)

    # Check for unpaid fees — block if any
    unpaid = await db.transactions.find({
        "user_id": user_id, "fee_paid": False, "fee": {"$ne": "0.00"}
    }, {"_id": 0, "fee": 1}).to_list(100000)
    total_unpaid = sum((Decimal(str(t["fee"])) for t in unpaid), Decimal("0"))
    if total_unpaid > 0:
        if user.get("preferred_language") == "it":
            msg = f"Prelievo bloccato. Hai {total_unpaid.quantize(Decimal('0.01'))} EUR in commissioni in sospeso che devono essere pagate prima."
        else:
            msg = f"Withdrawal blocked. You have {total_unpaid.quantize(Decimal('0.01'))} EUR in outstanding fees that must be paid first."
        raise HTTPException(status_code=400, detail=msg)

    # Get EUR wallet
    wallet = await db.wallets.find_one({"user_id": user_id, "asset": "EUR"}, {"_id": 0})
    if not wallet:
        raise HTTPException(status_code=404, detail="EUR wallet not found.")

    eur_balance = Decimal(str(wallet["balance"]))
    if amount > eur_balance:
        msg = f"L'importo supera il saldo EUR ({eur_balance})." if user.get("preferred_language") == "it" else f"Amount exceeds EUR balance ({eur_balance})."
        raise HTTPException(status_code=400, detail=msg)

    # Validate IBAN (basic)
    iban_clean = req.iban.replace(" ", "").upper()
    if len(iban_clean) < 15:
        msg = "Inserisci un IBAN valido." if user.get("preferred_language") == "it" else "Please enter a valid IBAN."
        raise HTTPException(status_code=400, detail=msg)
    if not req.beneficiary_first_name.strip() or not req.beneficiary_last_name.strip():
        msg = "Il nome del beneficiario è obbligatorio." if user.get("preferred_language") == "it" else "Beneficiary name is required."
        raise HTTPException(status_code=400, detail=msg)

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

    # Send confirmation email
    lang = user.get("preferred_language", "en")
    user_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user.get('username', 'User')
    iban_desc = f"IBAN: {iban_clean} ({beneficiary})"
    subj, body_html = get_email_service().get_transaction_notification_email(
        user_name=user_name, tx_type="withdrawal", amount=str(amount), asset="EUR",
        tx_date=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        description=iban_desc, lang=lang, status="processing"
    )
    asyncio.create_task(get_email_service().send_email(user["email"], subj, body_html))

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
    inflow_types = {"deposit", "receive"}
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

    # Check for unpaid fees - user-level flag is authoritative
    unpaid = await db.transactions.find({
        "user_id": current_user["user_id"], "fee_paid": False, "fee": {"$ne": "0.00"}
    }, {"_id": 0}).to_list(10000)
    total_unpaid_fees_from_txs = sum((Decimal(str(t["fee"])) for t in unpaid), Decimal("0"))
    user_fees_paid = user.get("fees_paid", True)
    user_total_unpaid = Decimal(str(user.get("total_unpaid_fees", "0")))
    total_unpaid_fees = max(total_unpaid_fees_from_txs, user_total_unpaid)
    has_unpaid_fees = not user_fees_paid

    lang = user.get("preferred_language", "en")

    # Frozen account blocks everything
    if user.get("freeze_type", "none") != "none":
        frozen_reason = "Account congelato. Risolvi prima le restrizioni." if lang == "it" else "Account is frozen. Please resolve account restrictions first."
        return {"ok": True, "data": {
            "send": {"allowed": False, "reason": frozen_reason},
            "withdraw_usdc": {"allowed": False, "reason": frozen_reason},
            "withdraw_eur": {"allowed": False, "reason": frozen_reason},
            "swap": {"allowed": False, "reason": frozen_reason},
        }}

    q = Decimal("0.01")
    # Calculate available USDC: inflows (paid-fee) - outflows (swaps excluded from inflows)
    usdc_total = Decimal(str(wallet_map.get("USDC", {}).get("balance", "0")))
    inflow_txs = await db.transactions.find({
        "user_id": current_user["user_id"], "asset": "USDC",
        "type": {"$in": ["deposit", "receive"]},
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
        send_reason = "Nessun saldo USDC disponibile. Gli importi da transazioni con commissioni non pagate non possono essere inviati." if lang == "it" else "No available USDC balance. Amounts from transactions with unpaid fees cannot be sent."
        eligibility["send"] = {"allowed": False, "reason": send_reason}

    # Withdraw USDC
    if usdc_available > 0:
        eligibility["withdraw_usdc"] = {"allowed": True, "max_amount": str(usdc_available.quantize(q))}
    else:
        wusdc_reason = "Nessun saldo USDC disponibile." if lang == "it" else "No available USDC balance."
        eligibility["withdraw_usdc"] = {"allowed": False, "reason": wusdc_reason}

    # Swap — allowed if user has ANY balance in either USDC or EUR
    if usdc_total > 0 or eur_total > 0:
        eligibility["swap"] = {
            "allowed": True,
            "usdc_balance": str(usdc_total.quantize(q)),
            "eur_balance": str(eur_total.quantize(q)),
        }
    else:
        swap_reason = "Nessun saldo da scambiare." if lang == "it" else "No balance to swap."
        eligibility["swap"] = {"allowed": False, "reason": swap_reason}

    # Withdraw EUR — always allow opening modal if EUR > 0, show fees prompt inside modal
    if eur_total > 0:
        if has_unpaid_fees:
            fees_reason = f"Il prelievo EUR è bloccato fino al pagamento di tutte le commissioni in sospeso ({total_unpaid_fees.quantize(q)} EUR)." if lang == "it" else f"EUR withdrawal is blocked until all outstanding fees ({total_unpaid_fees.quantize(q)} EUR) are paid."
            eligibility["withdraw_eur"] = {
                "allowed": True,
                "blocked_by_fees": True,
                "max_amount": str(eur_total.quantize(q)),
                "total_unpaid_fees": str(total_unpaid_fees.quantize(q)),
                "reason": fees_reason
            }
        else:
            eur_msg = "Il prelievo EUR è disponibile tramite IBAN attraverso la tua app collegata ECOMMBX." if lang == "it" else "EUR withdrawal is available via IBAN through your connected app ECOMMBX."
            eligibility["withdraw_eur"] = {
                "allowed": True,
                "blocked_by_fees": False,
                "max_amount": str(eur_total.quantize(q)),
                "method": "iban",
                "message": eur_msg
            }
    else:
        noeur_reason = "Nessun saldo EUR da prelevare." if lang == "it" else "No EUR balance to withdraw."
        eligibility["withdraw_eur"] = {"allowed": False, "reason": noeur_reason}

    return {"ok": True, "data": eligibility}


# ── Email Unsubscribe (required for anti-spam compliance) ───────────

@api_router.get("/unsubscribe")
@api_router.post("/unsubscribe")
async def email_unsubscribe(email: str = Query(default="")):
    """Handle email unsubscribe requests (List-Unsubscribe header compliance)."""
    if email:
        await db.users.update_one(
            {"email": email},
            {"$set": {"email_unsubscribed": True}}
        )
        logger.info(f"User {email} unsubscribed from emails")
    return {"ok": True, "message": "You have been unsubscribed from promotional emails."}


# ============== TEMPORARY MIGRATION ENDPOINT ==============

@api_router.post("/migrate/import")
async def migrate_import(request: Request):
    """Temporary endpoint to import data from preview to production"""
    body = await request.json()
    secret = body.get("secret")
    if secret != "migrate-2026-secure":
        raise HTTPException(status_code=403, detail="Forbidden")
    
    collection_name = body.get("collection")
    documents = body.get("documents", [])
    drop_first = body.get("drop_first", False)
    
    if not collection_name or not documents:
        return {"error": "Missing collection or documents"}
    
    col = db[collection_name]
    
    # Only drop on first chunk
    if drop_first:
        await col.delete_many({})
    
    # Clean documents - remove $oid and $date wrappers from bson json_util format
    def clean_doc(doc):
        if isinstance(doc, dict):
            if "$oid" in doc:
                return doc["$oid"]
            if "$date" in doc:
                return doc["$date"]
            return {k: clean_doc(v) for k, v in doc.items()}
        elif isinstance(doc, list):
            return [clean_doc(item) for item in doc]
        return doc
    
    cleaned = [clean_doc(d) for d in documents]
    
    # Remove _id fields to let MongoDB generate new ones
    for d in cleaned:
        if "_id" in d:
            del d["_id"]
    
    if cleaned:
        await col.insert_many(cleaned)
    
    return {"ok": True, "collection": collection_name, "imported": len(cleaned)}



# ============== HEALTH CHECK (root level for K8s) ==============

@app.get("/health")
async def root_health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "frontend_url": os.environ.get("FRONTEND_URL", "NOT_SET"),
        "sender_email": os.environ.get("SENDER_EMAIL", "NOT_SET")
    }

# ============== INCLUDE ROUTER ==============

app.include_router(api_router)

# ============== CORS ==============

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Refreshed-Token"],
)
