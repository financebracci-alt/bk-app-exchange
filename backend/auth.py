"""
Authentication utilities for Zenthos Wallet Platform
JWT tokens, password hashing, and authentication middleware
"""

from datetime import datetime, timezone, timedelta
from typing import Optional
import jwt
import bcrypt
import secrets
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

import os

# Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', secrets.token_hex(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24  # 24 hours

security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )


def create_access_token(user_id: str, email: str, role: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    
    to_encode = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    }
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current user from JWT token and issue a refreshed token (sliding session)."""
    token = credentials.credentials
    payload = decode_token(token)
    # Create a refreshed token with a fresh 24h expiry
    refreshed_token = create_access_token(
        payload.get("sub"), payload.get("email"), payload.get("role")
    )
    request.state.refreshed_token = refreshed_token
    return {
        "user_id": payload.get("sub"),
        "email": payload.get("email"),
        "role": payload.get("role"),
    }


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Require admin or superadmin role"""
    if current_user["role"] not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def require_superadmin(current_user: dict = Depends(get_current_user)) -> dict:
    """Require superadmin role"""
    if current_user["role"] != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return current_user


def generate_reset_token() -> str:
    """Generate a secure password reset token"""
    return secrets.token_urlsafe(32)


def generate_verification_token() -> str:
    """Generate a secure email verification token"""
    return secrets.token_urlsafe(32)
