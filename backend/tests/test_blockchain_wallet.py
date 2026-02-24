"""
Blockchain Wallet Platform - Backend API Tests
Tests for authentication, admin panel, wallet, and freeze account functionality
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@blockchain.com"
ADMIN_PASSWORD = "admin123"
FROZEN_USER_EMAIL = "testfrozen@test.com"
FROZEN_USER_PASSWORD = "Test123!"

# Session tokens for reuse
admin_token = None
frozen_user_token = None
frozen_user_id = None


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data["status"] == "healthy"
        print("Health check passed")


class TestAuthentication:
    """Authentication flow tests"""
    
    def test_admin_login(self):
        """Test admin login"""
        global admin_token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert data["ok"] is True
        assert "token" in data["data"]
        assert data["data"]["user"]["email"] == ADMIN_EMAIL
        admin_token = data["data"]["token"]
        print(f"Admin login successful, role: {data['data']['user']['role']}")
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("Invalid credentials correctly rejected")
    
    def test_get_admin_profile(self):
        """Test getting admin profile"""
        global admin_token
        if not admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["data"]["user"]["email"] == ADMIN_EMAIL
        print("Admin profile retrieved successfully")


class TestAdminUsersPage:
    """Tests for Admin Users page functionality"""
    
    def test_admin_list_users(self):
        """Test admin can list users"""
        global admin_token
        if not admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"page": 1, "page_size": 20}
        )
        assert response.status_code == 200, f"List users failed: {response.text}"
        data = response.json()
        assert data["ok"] is True
        assert "users" in data["data"]
        assert isinstance(data["data"]["users"], list)
        assert "total" in data["data"]
        print(f"Admin users list: {data['data']['total']} users found")
    
    def test_admin_search_users(self):
        """Test admin can search users"""
        global admin_token
        if not admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"search": "admin"}
        )
        assert response.status_code == 200, f"Search users failed: {response.text}"
        data = response.json()
        assert data["ok"] is True
        print(f"Search results: {len(data['data']['users'])} users found")
    
    def test_admin_filter_users_by_status(self):
        """Test admin can filter users by status"""
        global admin_token
        if not admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"status": "active"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        print(f"Filter by active status: {len(data['data']['users'])} users")


class TestAdminKYCQueue:
    """Tests for Admin KYC Queue functionality"""
    
    def test_admin_get_kyc_queue(self):
        """Test admin can get KYC queue"""
        global admin_token
        if not admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/kyc-queue",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"KYC queue failed: {response.text}"
        data = response.json()
        assert data["ok"] is True
        assert "kyc_submissions" in data["data"]
        print(f"KYC queue: {len(data['data']['kyc_submissions'])} submissions")


class TestCreateFrozenUser:
    """Create a frozen test user for testing popup behavior"""
    
    def test_create_frozen_user(self):
        """Create a test user with frozen account"""
        global admin_token, frozen_user_id
        if not admin_token:
            pytest.skip("Admin token not available")
        
        # First check if user exists and delete if needed
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"search": FROZEN_USER_EMAIL}
        )
        if response.status_code == 200:
            data = response.json()
            for user in data["data"].get("users", []):
                if user["email"] == FROZEN_USER_EMAIL:
                    # Delete existing user
                    requests.delete(
                        f"{BASE_URL}/api/admin/users/{user['id']}",
                        headers={"Authorization": f"Bearer {admin_token}"}
                    )
                    print(f"Deleted existing test user: {FROZEN_USER_EMAIL}")
        
        # Create new frozen user
        response = requests.post(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "email": FROZEN_USER_EMAIL,
                "username": "testfrozen",
                "password": FROZEN_USER_PASSWORD,
                "first_name": "Test",
                "last_name": "Frozen",
                "date_of_birth": "1990-01-01",
                "freeze_type": "unusual_activity",
                "initial_usdc_balance": "5000.00",
                "total_fees": "125.00"
            }
        )
        assert response.status_code == 200, f"Create frozen user failed: {response.text}"
        data = response.json()
        assert data["ok"] is True
        frozen_user_id = data["data"]["user"]["id"]
        assert data["data"]["user"]["freeze_type"] == "unusual_activity"
        print(f"Created frozen user with ID: {frozen_user_id}")
    
    def test_frozen_user_login(self):
        """Test frozen user can login"""
        global frozen_user_token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FROZEN_USER_EMAIL,
            "password": FROZEN_USER_PASSWORD
        })
        assert response.status_code == 200, f"Frozen user login failed: {response.text}"
        data = response.json()
        assert data["ok"] is True
        frozen_user_token = data["data"]["token"]
        assert data["data"]["user"]["freeze_type"] == "unusual_activity"
        print(f"Frozen user login successful, freeze_type: {data['data']['user']['freeze_type']}")


class TestWalletFunctionality:
    """Tests for wallet functionality"""
    
    def test_get_wallet_balance(self):
        """Test frozen user can get wallet balance"""
        global frozen_user_token
        if not frozen_user_token:
            pytest.skip("Frozen user token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/wallet/balance",
            headers={"Authorization": f"Bearer {frozen_user_token}"}
        )
        assert response.status_code == 200, f"Get balance failed: {response.text}"
        data = response.json()
        assert data["ok"] is True
        assert "wallets" in data["data"]
        print(f"Wallet balance retrieved, wallets: {len(data['data']['wallets'])}")
    
    def test_get_unpaid_fees(self):
        """Test get unpaid fees endpoint (bug fix verification)"""
        global frozen_user_token
        if not frozen_user_token:
            pytest.skip("Frozen user token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/wallet/unpaid-fees",
            headers={"Authorization": f"Bearer {frozen_user_token}"}
        )
        assert response.status_code == 200, f"Get unpaid fees failed: {response.text}"
        data = response.json()
        assert data["ok"] is True
        assert "total_unpaid_fees" in data["data"]
        print(f"Unpaid fees: ${data['data']['total_unpaid_fees']}")
    
    def test_get_transactions(self):
        """Test get user transactions"""
        global frozen_user_token
        if not frozen_user_token:
            pytest.skip("Frozen user token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/wallet/transactions",
            headers={"Authorization": f"Bearer {frozen_user_token}"}
        )
        assert response.status_code == 200, f"Get transactions failed: {response.text}"
        data = response.json()
        assert data["ok"] is True
        assert "transactions" in data["data"]
        print(f"Transactions: {len(data['data']['transactions'])} found")


class TestRequestUnfreeze:
    """Tests for account unfreeze request (email sending)"""
    
    def test_request_unfreeze_email(self):
        """Test frozen user can request account unfreeze (triggers email)"""
        global frozen_user_token
        if not frozen_user_token:
            pytest.skip("Frozen user token not available")
        
        response = requests.post(
            f"{BASE_URL}/api/account/request-unfreeze",
            headers={"Authorization": f"Bearer {frozen_user_token}"}
        )
        assert response.status_code == 200, f"Request unfreeze failed: {response.text}"
        data = response.json()
        assert data["ok"] is True
        assert "message" in data
        print(f"Unfreeze request successful: {data['message']}")


class TestAdminStats:
    """Tests for admin dashboard stats"""
    
    def test_get_admin_stats(self):
        """Test admin can get dashboard stats"""
        global admin_token
        if not admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get stats failed: {response.text}"
        data = response.json()
        assert data["ok"] is True
        assert "total_users" in data["data"]
        assert "frozen_users" in data["data"]
        print(f"Admin stats: {data['data']['total_users']} total users, {data['data']['frozen_users']} frozen")


class TestAdminSendEmail:
    """Tests for admin email sending functionality"""
    
    def test_admin_send_kyc_email(self):
        """Test admin can send KYC email to user"""
        global admin_token, frozen_user_id
        if not admin_token or not frozen_user_id:
            pytest.skip("Admin token or frozen user not available")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{frozen_user_id}/send-email",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"email_type": "kyc"}
        )
        assert response.status_code == 200, f"Send email failed: {response.text}"
        data = response.json()
        assert data["ok"] is True
        print(f"KYC email sent: {data['data']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
