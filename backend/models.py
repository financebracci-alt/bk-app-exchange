"""
Database Models for Blockchain Wallet Platform
All models use MongoDB with motor async driver
"""

from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, timezone, date
from decimal import Decimal
import uuid
from enum import Enum


# ============== ENUMS ==============

class UserRole(str, Enum):
    SUPERADMIN = "superadmin"
    ADMIN = "admin"
    USER = "user"


class AccountStatus(str, Enum):
    ACTIVE = "active"
    FROZEN = "frozen"
    PENDING_KYC = "pending_kyc"
    CLOSED = "closed"


class FreezeType(str, Enum):
    NONE = "none"
    UNUSUAL_ACTIVITY = "unusual_activity"
    INACTIVITY = "inactivity"
    BOTH = "both"


class KYCStatus(str, Enum):
    NOT_STARTED = "not_started"
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class TransactionType(str, Enum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    SEND = "send"
    RECEIVE = "receive"
    SWAP = "swap"
    FEE = "fee"
    ADJUSTMENT = "adjustment"


class TransactionStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AssetType(str, Enum):
    USDC = "USDC"
    EUR = "EUR"


# ============== USER MODELS ==============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    username: str
    password_hash: str
    first_name: str
    last_name: str
    date_of_birth: str  # Format: YYYY-MM-DD
    phone: Optional[str] = None
    
    # Role and status
    role: UserRole = UserRole.USER
    account_status: AccountStatus = AccountStatus.ACTIVE
    
    # Freeze settings
    freeze_type: FreezeType = FreezeType.NONE
    freeze_reason: Optional[str] = None
    freeze_date: Optional[str] = None
    
    # KYC
    kyc_status: KYCStatus = KYCStatus.NOT_STARTED
    kyc_submitted_at: Optional[str] = None
    kyc_reviewed_at: Optional[str] = None
    kyc_reviewed_by: Optional[str] = None
    
    # Wallet
    eth_wallet_address: Optional[str] = None
    
    # Connected app
    connected_app_name: Optional[str] = None
    connected_app_logo: Optional[str] = None
    
    # Fees
    total_unpaid_fees: str = "0.00"  # Decimal as string
    fees_paid: bool = False
    
    # Display settings (admin controlled)
    show_fees_alert: bool = True  # Show outstanding fees alert to user
    show_freeze_alert: bool = True  # Show freeze alert to user
    
    # Password reset
    password_reset_required: bool = False
    password_reset_token: Optional[str] = None
    password_reset_expires: Optional[str] = None
    
    # Email verification
    email_verified: bool = False
    email_verification_token: Optional[str] = None
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_login: Optional[str] = None
    
    # Created by admin
    created_by: Optional[str] = None  # Admin user ID


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    first_name: str
    last_name: str
    date_of_birth: str
    phone: Optional[str] = None
    
    # Initial setup (admin only)
    eth_wallet_address: Optional[str] = None
    connected_app_name: Optional[str] = None
    connected_app_logo: Optional[str] = None
    
    # Initial balance setup
    initial_usdc_balance: Optional[str] = "0.00"
    initial_eur_balance: Optional[str] = "0.00"
    
    # Transaction history generation
    total_fees: Optional[str] = "0.00"
    transaction_start_date: Optional[str] = None  # YYYY-MM-DD
    transaction_end_date: Optional[str] = None    # YYYY-MM-DD
    
    # Freeze settings
    freeze_type: FreezeType = FreezeType.NONE
    
    # Role (admin can set)
    role: UserRole = UserRole.USER


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    phone: Optional[str] = None
    eth_wallet_address: Optional[str] = None
    connected_app_name: Optional[str] = None
    connected_app_logo: Optional[str] = None
    account_status: Optional[AccountStatus] = None
    freeze_type: Optional[FreezeType] = None
    freeze_reason: Optional[str] = None
    role: Optional[UserRole] = None
    total_unpaid_fees: Optional[str] = None
    fees_paid: Optional[bool] = None
    password_reset_required: Optional[bool] = None
    kyc_status: Optional[KYCStatus] = None
    # Display settings
    show_fees_alert: Optional[bool] = None
    show_freeze_alert: Optional[bool] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    """Public user data returned to frontend"""
    id: str
    email: str
    username: str
    first_name: str
    last_name: str
    role: UserRole
    account_status: AccountStatus
    freeze_type: FreezeType
    freeze_reason: Optional[str] = None
    kyc_status: KYCStatus
    eth_wallet_address: Optional[str] = None
    connected_app_name: Optional[str] = None
    connected_app_logo: Optional[str] = None
    total_unpaid_fees: str
    fees_paid: bool
    password_reset_required: bool
    email_verified: bool
    created_at: str
    # Display settings
    show_fees_alert: bool = True
    show_freeze_alert: bool = True


# ============== WALLET MODELS ==============

class Wallet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    asset: AssetType
    balance: str = "0.00"  # Decimal as string
    locked_balance: str = "0.00"  # Locked for pending transactions
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class WalletUpdate(BaseModel):
    balance: Optional[str] = None
    locked_balance: Optional[str] = None


# ============== TRANSACTION MODELS ==============

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    wallet_id: str
    
    # Transaction details
    type: TransactionType
    asset: AssetType
    amount: str  # Decimal as string
    fee: str = "0.00"  # Fee for this transaction
    fee_paid: bool = False
    
    # Status
    status: TransactionStatus = TransactionStatus.COMPLETED
    
    # Additional info
    description: Optional[str] = None
    reference: Optional[str] = None
    tx_hash: Optional[str] = None  # Fake blockchain tx hash
    
    # Counterparty info (for send/receive)
    counterparty_address: Optional[str] = None
    counterparty_name: Optional[str] = None
    
    # Timestamps
    transaction_date: str  # The date transaction "occurred"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    # Created by admin (for manual adjustments)
    created_by_admin: bool = False
    admin_id: Optional[str] = None


class TransactionCreate(BaseModel):
    user_id: str
    type: TransactionType
    asset: AssetType
    amount: str
    fee: str = "0.00"
    fee_paid: bool = False
    description: Optional[str] = None
    transaction_date: Optional[str] = None  # If not provided, uses current time
    counterparty_address: Optional[str] = None
    status: TransactionStatus = TransactionStatus.COMPLETED


# ============== KYC MODELS ==============

class KYCDocument(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    
    # Document types
    id_document_type: Optional[str] = None  # "passport" or "id_card"
    id_document_front: Optional[str] = None  # Base64 image
    id_document_back: Optional[str] = None   # Base64 image (for ID card)
    
    selfie_with_id: Optional[str] = None     # Base64 image
    proof_of_address: Optional[str] = None   # Base64 image
    
    # Status
    status: KYCStatus = KYCStatus.PENDING
    rejection_reason: Optional[str] = None
    
    # Review info
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    
    # Timestamps
    submitted_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class KYCSubmit(BaseModel):
    id_document_type: str  # "passport" or "id_card"
    id_document_front: str  # Base64 image
    id_document_back: Optional[str] = None  # Base64 image (for ID card)
    selfie_with_id: str  # Base64 image
    proof_of_address: str  # Base64 image


class KYCReview(BaseModel):
    status: Literal["approved", "rejected"]
    rejection_reason: Optional[str] = None


# ============== AUDIT LOG MODELS ==============

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    admin_id: str
    admin_email: str
    
    # Action details
    action: str  # e.g., "user_created", "balance_adjusted", "kyc_approved"
    target_type: str  # e.g., "user", "wallet", "transaction"
    target_id: str
    
    # Details
    details: dict = {}  # Additional context
    ip_address: Optional[str] = None
    
    # Timestamp
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ============== EMAIL LOG MODELS ==============

class EmailLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    
    # Email details
    email_type: str  # "kyc_verification", "password_reset", "reactivation", "fee_payment"
    subject: str
    body: str
    
    # Status
    sent: bool = False
    sent_at: Optional[str] = None
    error: Optional[str] = None
    
    # Resend info
    resend_id: Optional[str] = None
    
    # Timestamp
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ============== SYSTEM SETTINGS ==============

class SystemSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = "system_settings"
    
    # Maintenance mode
    maintenance_mode: bool = False
    maintenance_message: str = "System is under maintenance. Please try again later."
    
    # Registration
    allow_registration: bool = True
    require_email_verification: bool = True
    
    # Default fees
    default_transaction_fee_percent: str = "2.5"
    minimum_deposit: str = "100.00"
    minimum_withdrawal: str = "50.00"
    
    # Email settings
    resend_api_key: Optional[str] = None
    sender_email: str = "noreply@blockchain.com"
    sender_name: str = "Blockchain.com"
    
    # Timestamps
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ============== SESSION MODELS ==============

class Session(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    token: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: str
    is_active: bool = True
