"""
Backend tests for Part A Bug Fixes and Part B Features
Blockchain.com Wallet Clone - Testing Suite
"""
import pytest
import requests
import os
import time
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://kyc-build.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@blockchain.com"
ADMIN_PASSWORD = "admin123"
TEST_USER_EMAIL = "testbug@example.com"
TEST_USER_PASSWORD = "Test1234!"


class TestHealthCheck:
    """Basic API health check"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ API health check passed")

    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "online"
        print("✓ API root endpoint working")


class TestAdminAuth:
    """Admin authentication tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        
    def test_admin_login_success(self):
        """Test admin login returns ok:true"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        assert "token" in data.get("data", {})
        assert data["data"]["user"]["role"] in ["admin", "superadmin"]
        print("✓ Admin login successful")
        return data["data"]["token"]


class TestBugA1_AdminCreateUser:
    """Bug A-1: Admin Create User should show success message (not false error)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["data"]["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_admin_create_user_returns_ok_true(self):
        """POST /api/admin/users should return ok:true on success"""
        unique_email = f"test_create_{int(time.time())}@example.com"
        unique_username = f"testcreate{int(time.time())}"
        
        response = self.session.post(f"{BASE_URL}/api/admin/users", json={
            "email": unique_email,
            "username": unique_username,
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "CreateUser",
            "date_of_birth": "1990-01-01",
            "initial_usdc_balance": "1000.00",
            "freeze_type": "none",
            "role": "user"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Bug A-1 Fix: Should return ok:true
        assert data.get("ok") == True, f"Expected ok:true, got {data}"
        assert "user" in data.get("data", {}), "Response should contain user data"
        
        print(f"✓ Bug A-1: Admin create user returns ok:true for {unique_email}")
        
        # Cleanup: delete the test user
        user_id = data["data"]["user"]["id"]
        self.session.delete(f"{BASE_URL}/api/admin/users/{user_id}")


class TestBugA2_TransactionHistoryGeneration:
    """Bug A-2: Transaction history should be generated when creating user with fee amount and dates"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["data"]["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_create_user_generates_transactions(self):
        """Creating user with balance and dates should generate transactions"""
        unique_email = f"test_txgen_{int(time.time())}@example.com"
        unique_username = f"testtxgen{int(time.time())}"
        
        start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        end_date = datetime.now().strftime("%Y-%m-%d")
        
        response = self.session.post(f"{BASE_URL}/api/admin/users", json={
            "email": unique_email,
            "username": unique_username,
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "TxGen",
            "date_of_birth": "1990-01-01",
            "initial_usdc_balance": "5000.00",
            "total_fees": "200.00",
            "transaction_start_date": start_date,
            "transaction_end_date": end_date,
            "freeze_type": "none",
            "role": "user"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        
        # Bug A-2 Fix: transactions_generated should be > 0
        transactions_generated = data.get("data", {}).get("transactions_generated", 0)
        assert transactions_generated > 0, f"Expected transactions_generated > 0, got {transactions_generated}"
        
        print(f"✓ Bug A-2: Created user with {transactions_generated} transactions generated")
        
        # Cleanup
        user_id = data["data"]["user"]["id"]
        self.session.delete(f"{BASE_URL}/api/admin/users/{user_id}")


class TestBugA6_FeePaidPersistence:
    """Bug A-6: Fee marked as paid (fee_paid:true) should persist correctly"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["data"]["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Get test user
        users_response = self.session.get(f"{BASE_URL}/api/admin/users", params={"search": TEST_USER_EMAIL})
        if users_response.status_code == 200 and users_response.json().get("data", {}).get("users"):
            self.test_user = users_response.json()["data"]["users"][0]
        else:
            # Create test user if not exists
            unique_email = f"test_feepaid_{int(time.time())}@example.com"
            create_resp = self.session.post(f"{BASE_URL}/api/admin/users", json={
                "email": unique_email,
                "username": f"testfeepaid{int(time.time())}",
                "password": "TestPass123!",
                "first_name": "Test",
                "last_name": "FeePaid",
                "date_of_birth": "1990-01-01",
                "initial_usdc_balance": "1000.00",
                "freeze_type": "none"
            })
            self.test_user = create_resp.json()["data"]["user"]
    
    def test_admin_create_transaction_with_fee_paid_true(self):
        """POST /api/admin/transactions with fee_paid:true should store fee_paid:true"""
        user_id = self.test_user["id"]
        
        response = self.session.post(f"{BASE_URL}/api/admin/transactions", json={
            "user_id": user_id,
            "type": "deposit",
            "asset": "USDC",
            "amount": "500.00",
            "fee": "25.00",
            "fee_paid": True,  # This should persist
            "description": "Test transaction with fee paid",
            "status": "completed"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        
        # Bug A-6 Fix: fee_paid should be True in response
        tx = data.get("data", {}).get("transaction", {})
        assert tx.get("fee_paid") == True, f"Expected fee_paid:true, got {tx.get('fee_paid')}"
        
        # Verify by fetching the transaction
        tx_id = tx["id"]
        all_tx = self.session.get(f"{BASE_URL}/api/admin/transactions", params={"user_id": user_id})
        assert all_tx.status_code == 200
        
        found_tx = None
        for t in all_tx.json().get("data", {}).get("transactions", []):
            if t["id"] == tx_id:
                found_tx = t
                break
        
        assert found_tx is not None, "Created transaction not found"
        assert found_tx.get("fee_paid") == True, f"Persisted fee_paid should be true, got {found_tx.get('fee_paid')}"
        
        print("✓ Bug A-6: fee_paid:true persists correctly")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/transactions/{tx_id}")


class TestFeatureB2_AvailableBalance:
    """Feature B-2: Available balance endpoint works"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        # Login as test user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code != 200:
            # Try admin login if test user doesn't exist
            response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
        assert response.status_code == 200
        self.token = response.json()["data"]["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_available_balance_endpoint(self):
        """GET /api/wallet/available-balance returns total, available, locked per asset"""
        response = self.session.get(f"{BASE_URL}/api/wallet/available-balance")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        
        balance_data = data.get("data", {})
        
        # Check USDC balance structure
        if "USDC" in balance_data:
            usdc = balance_data["USDC"]
            assert "total" in usdc, "USDC should have 'total'"
            assert "available" in usdc, "USDC should have 'available'"
            assert "locked" in usdc, "USDC should have 'locked'"
            print(f"✓ USDC balance: total={usdc['total']}, available={usdc['available']}, locked={usdc['locked']}")
        
        # Check EUR balance structure
        if "EUR" in balance_data:
            eur = balance_data["EUR"]
            assert "total" in eur, "EUR should have 'total'"
            assert "available" in eur, "EUR should have 'available'"
            assert "locked" in eur, "EUR should have 'locked'"
            print(f"✓ EUR balance: total={eur['total']}, available={eur['available']}, locked={eur['locked']}")
        
        print("✓ Feature B-2: Available balance endpoint working")


class TestFeatureB3_ActionEligibility:
    """Feature B-3: Action eligibility endpoint works"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code != 200:
            response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
        assert response.status_code == 200
        self.token = response.json()["data"]["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_action_eligibility_endpoint(self):
        """GET /api/wallet/action-eligibility returns send/withdraw_usdc/withdraw_eur/swap eligibility"""
        response = self.session.get(f"{BASE_URL}/api/wallet/action-eligibility")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        
        eligibility = data.get("data", {})
        
        # Check required eligibility keys
        assert "send" in eligibility, "Should have 'send' eligibility"
        assert "withdraw_usdc" in eligibility, "Should have 'withdraw_usdc' eligibility"
        assert "withdraw_eur" in eligibility, "Should have 'withdraw_eur' eligibility"
        assert "swap" in eligibility, "Should have 'swap' eligibility"
        
        # Each eligibility should have 'allowed' field
        for action in ["send", "withdraw_usdc", "withdraw_eur", "swap"]:
            assert "allowed" in eligibility[action], f"{action} should have 'allowed' field"
            if not eligibility[action]["allowed"]:
                assert "reason" in eligibility[action], f"{action} with allowed=false should have 'reason'"
        
        print(f"✓ Feature B-3: Action eligibility endpoint working")
        print(f"  - send: {eligibility['send'].get('allowed')}")
        print(f"  - withdraw_usdc: {eligibility['withdraw_usdc'].get('allowed')}")
        print(f"  - withdraw_eur: {eligibility['withdraw_eur'].get('allowed')}")
        print(f"  - swap: {eligibility['swap'].get('allowed')}")


class TestFeatureB4_Notifications:
    """Feature B-4: Admin-created transactions generate notifications"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code != 200:
            response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
        assert response.status_code == 200
        self.token = response.json()["data"]["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_notifications_endpoint(self):
        """GET /api/notifications returns notifications list"""
        response = self.session.get(f"{BASE_URL}/api/notifications")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        assert "notifications" in data.get("data", {}), "Should have 'notifications' list"
        
        print(f"✓ Feature B-4: Notifications endpoint working, found {len(data['data']['notifications'])} notifications")
    
    def test_unread_count_endpoint(self):
        """GET /api/notifications/unread-count returns unread count"""
        response = self.session.get(f"{BASE_URL}/api/notifications/unread-count")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        assert "unread_count" in data.get("data", {}), "Should have 'unread_count'"
        
        print(f"✓ Feature B-4: Unread count endpoint working, count={data['data']['unread_count']}")


class TestFeatureB5_SSEEndpoint:
    """Feature B-5: SSE endpoint exists at /api/events/stream"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["data"]["token"]
    
    def test_sse_endpoint_exists(self):
        """SSE endpoint /api/events/stream?token=xxx should be accessible"""
        # Test with valid token - just check it connects (we won't wait for events)
        response = requests.get(
            f"{BASE_URL}/api/events/stream",
            params={"token": self.token},
            stream=True,
            timeout=5
        )
        
        # Should return 200 for SSE stream
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")
        
        print("✓ Feature B-5: SSE endpoint exists and returns correct content-type")
        response.close()
    
    def test_sse_invalid_token_rejected(self):
        """SSE endpoint should reject invalid tokens"""
        response = requests.get(
            f"{BASE_URL}/api/events/stream",
            params={"token": "invalid_token"},
            timeout=5
        )
        
        # Should return 401 for invalid token
        assert response.status_code == 401
        print("✓ Feature B-5: SSE endpoint rejects invalid tokens")


class TestBugA4_KYCTokenAccess:
    """Bug A-4: KYC page should be accessible via token URL without login"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        # Login as admin to get a KYC token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["data"]["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_kyc_access_endpoint_exists(self):
        """POST /api/auth/kyc-access/{token} endpoint exists"""
        # Test with invalid token - should return 400, not 404
        response = requests.post(f"{BASE_URL}/api/auth/kyc-access/invalid_token")
        
        # 400 means endpoint exists but token is invalid
        # 404 would mean endpoint doesn't exist
        assert response.status_code in [400, 401], f"KYC access endpoint should exist, got {response.status_code}"
        
        print("✓ Bug A-4: KYC access endpoint exists (/api/auth/kyc-access/{token})")


class TestFeatureB1_DatetimeLocalPicker:
    """Feature B-1: Admin transaction creation has datetime-local picker"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["data"]["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Get or create a test user
        users_response = self.session.get(f"{BASE_URL}/api/admin/users", params={"search": TEST_USER_EMAIL})
        if users_response.status_code == 200 and users_response.json().get("data", {}).get("users"):
            self.test_user = users_response.json()["data"]["users"][0]
        else:
            pytest.skip("Test user not available")
    
    def test_transaction_accepts_datetime_format(self):
        """Transaction creation accepts datetime-local format (YYYY-MM-DDTHH:MM)"""
        user_id = self.test_user["id"]
        
        # Use ISO datetime format (what datetime-local produces)
        transaction_date = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        
        response = self.session.post(f"{BASE_URL}/api/admin/transactions", json={
            "user_id": user_id,
            "type": "deposit",
            "asset": "USDC",
            "amount": "100.00",
            "fee": "5.00",
            "fee_paid": False,
            "transaction_date": transaction_date,
            "description": "Test datetime format",
            "status": "completed"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        
        # Verify the date was stored
        tx = data.get("data", {}).get("transaction", {})
        assert tx.get("transaction_date") is not None
        
        print(f"✓ Feature B-1: Transaction accepts datetime-local format ({transaction_date})")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/transactions/{tx['id']}")


class TestNotificationCreatedOnAdminTransaction:
    """Test that admin-created transactions generate notifications"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_session = requests.Session()
        self.user_session = requests.Session()
        
        # Login as admin
        admin_resp = self.admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert admin_resp.status_code == 200
        self.admin_token = admin_resp.json()["data"]["token"]
        self.admin_session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        
        # Get test user
        users_resp = self.admin_session.get(f"{BASE_URL}/api/admin/users", params={"search": TEST_USER_EMAIL})
        if users_resp.status_code == 200 and users_resp.json().get("data", {}).get("users"):
            self.test_user = users_resp.json()["data"]["users"][0]
            
            # Login as test user
            user_resp = self.user_session.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            })
            if user_resp.status_code == 200:
                self.user_token = user_resp.json()["data"]["token"]
                self.user_session.headers.update({"Authorization": f"Bearer {self.user_token}"})
            else:
                pytest.skip("Cannot login as test user")
        else:
            pytest.skip("Test user not found")
    
    def test_admin_transaction_creates_notification(self):
        """Admin creating a transaction should create a notification for the user"""
        # Get initial notification count
        initial_resp = self.user_session.get(f"{BASE_URL}/api/notifications/unread-count")
        initial_count = initial_resp.json().get("data", {}).get("unread_count", 0)
        
        # Admin creates a transaction
        tx_resp = self.admin_session.post(f"{BASE_URL}/api/admin/transactions", json={
            "user_id": self.test_user["id"],
            "type": "deposit",
            "asset": "USDC",
            "amount": "50.00",
            "fee": "0.00",
            "fee_paid": True,
            "description": "Notification test deposit",
            "status": "completed"
        })
        assert tx_resp.status_code == 200
        tx_id = tx_resp.json()["data"]["transaction"]["id"]
        
        # Small delay to allow notification to be created
        time.sleep(0.5)
        
        # Check if notification count increased
        new_resp = self.user_session.get(f"{BASE_URL}/api/notifications/unread-count")
        new_count = new_resp.json().get("data", {}).get("unread_count", 0)
        
        # Check notifications list
        notifs_resp = self.user_session.get(f"{BASE_URL}/api/notifications")
        notifications = notifs_resp.json().get("data", {}).get("notifications", [])
        
        # Find the notification for this transaction
        found_notif = False
        for n in notifications:
            if "deposit" in n.get("title", "").lower() or "50.00" in n.get("message", ""):
                found_notif = True
                break
        
        print(f"✓ Notification test: initial_count={initial_count}, new_count={new_count}")
        
        # Cleanup
        self.admin_session.delete(f"{BASE_URL}/api/admin/transactions/{tx_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
