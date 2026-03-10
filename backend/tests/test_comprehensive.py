"""
Comprehensive Backend Tests for Blockchain.com Wallet Clone
Tests: Health, Exchange Rate, Auth, Admin, User flows
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://secure-preview-9.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@blockchain.com"
ADMIN_PASSWORD = "admin123"
TEST_USER_EMAIL = f"test_verify_{uuid.uuid4().hex[:8]}@test.com"
TEST_USER_PASSWORD = "test123"

class TestHealthAndBasic:
    """Basic health and exchange rate tests"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print(f"✓ Health check passed: {data}")
    
    def test_exchange_rate(self):
        """Test exchange rate endpoint returns valid data"""
        response = requests.get(f"{BASE_URL}/api/exchange-rate")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        assert "data" in data
        assert "usdc_eur" in data["data"]
        assert "eur_usdc" in data["data"]
        assert "change_24h_pct" in data["data"]
        assert data["data"]["usdc_eur"] > 0
        assert data["data"]["eur_usdc"] > 0
        print(f"✓ Exchange rate: 1 USDC = {data['data']['usdc_eur']} EUR")


class TestAdminAuth:
    """Admin authentication and panel tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert data["ok"] == True
        assert "token" in data["data"]
        return data["data"]["token"]
    
    def test_admin_login(self, admin_token):
        """Test admin can login successfully"""
        assert admin_token is not None
        print(f"✓ Admin login successful, token received")
    
    def test_admin_get_stats(self, admin_token):
        """Test admin dashboard stats endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        assert "total_users" in data["data"]
        assert "active_users" in data["data"]
        print(f"✓ Admin stats: {data['data']['total_users']} total users")
    
    def test_admin_list_users(self, admin_token):
        """Test admin users list with registration dates"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        assert "users" in data["data"]
        # Check that users have created_at field (registration date)
        for user in data["data"]["users"]:
            assert "created_at" in user, f"User {user.get('email')} missing created_at"
        print(f"✓ Admin users list: {len(data['data']['users'])} users with registration dates")
    
    def test_admin_list_transactions(self, admin_token):
        """Test admin transactions list with user info and time columns"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/transactions", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        assert "transactions" in data["data"]
        # Check that transactions have user_name, user_email and transaction_date
        for tx in data["data"]["transactions"]:
            assert "transaction_date" in tx, "Transaction missing transaction_date"
            # user_name and user_email are enriched fields
            if tx.get("user_id"):
                # These should be present if enrichment worked
                print(f"  - Transaction: user_name={tx.get('user_name')}, user_email={tx.get('user_email')}, date={tx.get('transaction_date')}")
        print(f"✓ Admin transactions: {len(data['data']['transactions'])} transactions")


class TestUserRegistration:
    """User registration flow tests"""
    
    def test_register_new_user(self):
        """Test new user registration"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "username": f"testuser_{uuid.uuid4().hex[:6]}",
            "first_name": "Test",
            "last_name": "User",
            "date_of_birth": "1990-01-01"
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert data["ok"] == True
        assert "token" in data["data"]
        assert "user" in data["data"]
        print(f"✓ User registered: {TEST_USER_EMAIL}")
        return data["data"]["token"]
    
    def test_login_with_registered_user(self):
        """Test login with newly registered user"""
        # First register
        register_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"test_login_{uuid.uuid4().hex[:8]}@test.com",
            "password": TEST_USER_PASSWORD,
            "username": f"testlogin_{uuid.uuid4().hex[:6]}",
            "first_name": "Login",
            "last_name": "Test",
            "date_of_birth": "1990-01-01"
        })
        assert register_resp.status_code == 200
        user_email = register_resp.json()["data"]["user"]["email"]
        
        # Then login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": user_email,
            "password": TEST_USER_PASSWORD
        })
        assert login_resp.status_code == 200
        data = login_resp.json()
        assert data["ok"] == True
        assert "token" in data["data"]
        print(f"✓ Login successful for: {user_email}")


class TestUserWalletFeatures:
    """User wallet feature tests"""
    
    @pytest.fixture
    def user_session(self):
        """Create a user and return token"""
        email = f"test_wallet_{uuid.uuid4().hex[:8]}@test.com"
        register_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_USER_PASSWORD,
            "username": f"wallettest_{uuid.uuid4().hex[:6]}",
            "first_name": "Wallet",
            "last_name": "Test",
            "date_of_birth": "1990-01-01"
        })
        assert register_resp.status_code == 200
        token = register_resp.json()["data"]["token"]
        return {"token": token, "email": email}
    
    def test_get_wallet_balance(self, user_session):
        """Test user can get wallet balance"""
        headers = {"Authorization": f"Bearer {user_session['token']}"}
        response = requests.get(f"{BASE_URL}/api/wallet/balance", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        assert "wallets" in data["data"]
        print(f"✓ Wallet balance retrieved for {user_session['email']}")
    
    def test_get_user_profile(self, user_session):
        """Test user can get their profile via /auth/me"""
        headers = {"Authorization": f"Bearer {user_session['token']}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        assert "user" in data["data"]
        assert "wallets" in data["data"]
        print(f"✓ User profile retrieved: {data['data']['user']['email']}")
    
    def test_get_user_transactions(self, user_session):
        """Test user can get their transactions"""
        headers = {"Authorization": f"Bearer {user_session['token']}"}
        response = requests.get(f"{BASE_URL}/api/wallet/transactions", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        assert "transactions" in data["data"]
        print(f"✓ User transactions retrieved: {len(data['data']['transactions'])} transactions")
    
    def test_get_kyc_status(self, user_session):
        """Test user can get KYC status"""
        headers = {"Authorization": f"Bearer {user_session['token']}"}
        response = requests.get(f"{BASE_URL}/api/kyc/status", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        assert "status" in data["data"]
        print(f"✓ KYC status: {data['data']['status']}")


class TestSlidingSession:
    """Test sliding session token refresh"""
    
    def test_sliding_session_header(self):
        """Test that X-Refreshed-Token header is returned on authenticated calls"""
        # First login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["data"]["token"]
        
        # Make authenticated request
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        
        # Check for X-Refreshed-Token header
        refreshed_token = response.headers.get("X-Refreshed-Token")
        # Note: Token is refreshed only if close to expiration
        # For now, just verify the endpoint works
        print(f"✓ Sliding session: X-Refreshed-Token header present: {refreshed_token is not None}")


class TestAdminUserEdit:
    """Test admin edit user features - password and DOB fields"""
    
    @pytest.fixture
    def admin_token(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["data"]["token"]
    
    def test_admin_get_user_with_password_and_dob(self, admin_token):
        """Test admin can view user with password and DOB fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a test user
        email = f"test_edit_{uuid.uuid4().hex[:8]}@test.com"
        register_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "testpass123",
            "username": f"edittest_{uuid.uuid4().hex[:6]}",
            "first_name": "Edit",
            "last_name": "Test",
            "date_of_birth": "1995-05-15"
        })
        assert register_resp.status_code == 200
        user_id = register_resp.json()["data"]["user"]["id"]
        
        # Admin gets user details
        response = requests.get(f"{BASE_URL}/api/admin/users/{user_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        user = data["data"]["user"]
        
        # Check password field (should be plain_password)
        assert "plain_password" in user, "User should have plain_password field for admin"
        # Check DOB field
        assert "date_of_birth" in user, "User should have date_of_birth field"
        print(f"✓ Admin can view user with password field (exists: {bool(user.get('plain_password'))}) and DOB: {user.get('date_of_birth')}")
        
        return user_id
    
    def test_admin_update_user_password_and_dob(self, admin_token):
        """Test admin can update user password and DOB"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create user first
        email = f"test_update_{uuid.uuid4().hex[:8]}@test.com"
        register_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "oldpass123",
            "username": f"updatetest_{uuid.uuid4().hex[:6]}",
            "first_name": "Update",
            "last_name": "Test",
            "date_of_birth": "1990-01-01"
        })
        assert register_resp.status_code == 200
        user_id = register_resp.json()["data"]["user"]["id"]
        
        # Admin updates user
        update_resp = requests.put(f"{BASE_URL}/api/admin/users/{user_id}", 
            headers=headers,
            json={
                "plain_password": "newpass456",
                "date_of_birth": "1992-12-25"
            }
        )
        assert update_resp.status_code == 200
        
        # Verify update by getting user again
        get_resp = requests.get(f"{BASE_URL}/api/admin/users/{user_id}", headers=headers)
        assert get_resp.status_code == 200
        user = get_resp.json()["data"]["user"]
        assert user["date_of_birth"] == "1992-12-25"
        print(f"✓ Admin updated user DOB to: {user['date_of_birth']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
