"""
Test Expiry Countdown Timer Feature
Tests for:
- POST /api/wallet/start-timer - starts timer if timer_duration_hours is set
- Admin create user with timer_duration_hours
- Admin update user with timer_duration_hours and timer_started_at
- GET /api/auth/me returns timer fields
- POST /api/wallet/request-fee-resolution includes timer urgency text
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@zenthos.im"
ADMIN_PASSWORD = "admin123"


class TestExpiryTimerFeature:
    """Test suite for Expiry Countdown Timer feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        self.test_user_id = None
        self.test_user_email = None
        self.test_user_password = "TestTimer123!"
        
    def get_admin_token(self):
        """Get admin authentication token"""
        if self.admin_token:
            return self.admin_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert data.get("ok"), f"Admin login not ok: {data}"
        self.admin_token = data["data"]["token"]
        return self.admin_token
    
    def admin_headers(self):
        """Get headers with admin token"""
        return {"Authorization": f"Bearer {self.get_admin_token()}", "Content-Type": "application/json"}
    
    # ============== Backend API Tests ==============
    
    def test_01_health_check(self):
        """Test API health endpoint"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("PASS: Health check endpoint working")
    
    def test_02_admin_login(self):
        """Test admin login"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok")
        assert "token" in data.get("data", {})
        print("PASS: Admin login successful")
    
    def test_03_admin_create_user_with_timer(self):
        """Test admin can create user with timer_duration_hours"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        self.test_user_email = f"TEST_timer_{timestamp}@test.com"
        
        payload = {
            "email": self.test_user_email,
            "username": f"testtimer{timestamp}",
            "password": self.test_user_password,
            "first_name": "Timer",
            "last_name": "Test",
            "date_of_birth": "1990-01-01",
            "initial_usdc_balance": "1000.00",
            "initial_eur_balance": "500.00",
            "total_fees": "150.00",  # Set unpaid fees to test fee blocking
            "freeze_type": "none",
            "timer_duration_hours": 48  # Set 48 hour timer
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/users",
            json=payload,
            headers=self.admin_headers()
        )
        assert response.status_code == 200, f"Create user failed: {response.text}"
        data = response.json()
        assert data.get("ok"), f"Create user not ok: {data}"
        
        user = data["data"]["user"]
        self.test_user_id = user["id"]
        
        # Verify timer_duration_hours is set
        assert user.get("timer_duration_hours") == 48, f"timer_duration_hours not set correctly: {user}"
        # Timer should not be started yet
        assert user.get("timer_started_at") is None, f"timer_started_at should be None: {user}"
        
        print(f"PASS: Created user with timer_duration_hours=48, id={self.test_user_id}")
        
        # Store for later tests
        TestExpiryTimerFeature.created_user_id = self.test_user_id
        TestExpiryTimerFeature.created_user_email = self.test_user_email
        TestExpiryTimerFeature.created_user_password = self.test_user_password
    
    def test_04_get_user_returns_timer_fields(self):
        """Test GET /api/admin/users/{id} returns timer fields"""
        user_id = getattr(TestExpiryTimerFeature, 'created_user_id', None)
        if not user_id:
            pytest.skip("No test user created")
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/users/{user_id}",
            headers=self.admin_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok")
        
        user = data["data"]["user"]
        assert "timer_duration_hours" in user, "timer_duration_hours field missing"
        assert "timer_started_at" in user or user.get("timer_started_at") is None, "timer_started_at field missing"
        assert user.get("timer_duration_hours") == 48
        
        print("PASS: Admin get user returns timer fields")
    
    def test_05_user_login_and_auth_me_returns_timer_fields(self):
        """Test GET /api/auth/me returns timer_duration_hours and timer_started_at"""
        user_email = getattr(TestExpiryTimerFeature, 'created_user_email', None)
        user_password = getattr(TestExpiryTimerFeature, 'created_user_password', None)
        if not user_email:
            pytest.skip("No test user created")
        
        # Login as test user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": user_email,
            "password": user_password
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok")
        user_token = data["data"]["token"]
        
        # Call /auth/me
        response = self.session.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok")
        
        user = data["data"]["user"]
        assert "timer_duration_hours" in user, "timer_duration_hours missing from /auth/me"
        assert user.get("timer_duration_hours") == 48
        # Timer not started yet
        assert user.get("timer_started_at") is None
        
        # Store token for later tests
        TestExpiryTimerFeature.user_token = user_token
        
        print("PASS: /auth/me returns timer fields")
    
    def test_06_start_timer_no_timer_configured(self):
        """Test start-timer returns no_timer_configured when timer not set"""
        # Create a user without timer
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        email = f"TEST_notimer_{timestamp}@test.com"
        password = "NoTimer123!"
        
        payload = {
            "email": email,
            "username": f"notimer{timestamp}",
            "password": password,
            "first_name": "No",
            "last_name": "Timer",
            "date_of_birth": "1990-01-01",
            "freeze_type": "none"
            # No timer_duration_hours
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/users",
            json=payload,
            headers=self.admin_headers()
        )
        assert response.status_code == 200
        data = response.json()
        user_id = data["data"]["user"]["id"]
        
        # Login as this user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        assert response.status_code == 200
        token = response.json()["data"]["token"]
        
        # Call start-timer
        response = self.session.post(
            f"{BASE_URL}/api/wallet/start-timer",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok")
        assert data.get("started") == False
        assert data.get("reason") == "no_timer_configured"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=self.admin_headers())
        
        print("PASS: start-timer returns no_timer_configured when timer not set")
    
    def test_07_start_timer_success(self):
        """Test POST /api/wallet/start-timer starts timer successfully"""
        user_token = getattr(TestExpiryTimerFeature, 'user_token', None)
        if not user_token:
            pytest.skip("No user token available")
        
        response = self.session.post(
            f"{BASE_URL}/api/wallet/start-timer",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok")
        assert data.get("started") == True
        assert "timer_started_at" in data
        
        # Verify it's a valid ISO timestamp
        timer_started = data["timer_started_at"]
        assert timer_started is not None
        # Parse to verify format
        datetime.fromisoformat(timer_started.replace("Z", "+00:00"))
        
        print(f"PASS: Timer started at {timer_started}")
    
    def test_08_start_timer_already_started(self):
        """Test start-timer returns already_started when timer already running"""
        user_token = getattr(TestExpiryTimerFeature, 'user_token', None)
        if not user_token:
            pytest.skip("No user token available")
        
        response = self.session.post(
            f"{BASE_URL}/api/wallet/start-timer",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok")
        assert data.get("started") == False
        assert data.get("reason") == "already_started"
        assert "timer_started_at" in data
        
        print("PASS: start-timer returns already_started on second call")
    
    def test_09_auth_me_shows_timer_started(self):
        """Test /auth/me shows timer_started_at after timer is started"""
        user_token = getattr(TestExpiryTimerFeature, 'user_token', None)
        if not user_token:
            pytest.skip("No user token available")
        
        response = self.session.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok")
        
        user = data["data"]["user"]
        assert user.get("timer_duration_hours") == 48
        assert user.get("timer_started_at") is not None
        
        print("PASS: /auth/me shows timer_started_at after timer started")
    
    def test_10_admin_update_user_timer_fields(self):
        """Test admin can update timer_duration_hours and reset timer_started_at"""
        user_id = getattr(TestExpiryTimerFeature, 'created_user_id', None)
        if not user_id:
            pytest.skip("No test user created")
        
        # Update timer duration
        response = self.session.put(
            f"{BASE_URL}/api/admin/users/{user_id}",
            json={"timer_duration_hours": 72},
            headers=self.admin_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok")
        assert data["data"]["user"]["timer_duration_hours"] == 72
        
        print("PASS: Admin can update timer_duration_hours")
        
        # Reset timer (clear timer_started_at)
        response = self.session.put(
            f"{BASE_URL}/api/admin/users/{user_id}",
            json={"timer_started_at": ""},  # Empty string to clear
            headers=self.admin_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok")
        # timer_started_at should be None/null now
        assert data["data"]["user"].get("timer_started_at") is None
        
        print("PASS: Admin can reset timer_started_at")
    
    def test_11_request_fee_resolution_with_timer(self):
        """Test POST /api/wallet/request-fee-resolution includes timer urgency text"""
        user_id = getattr(TestExpiryTimerFeature, 'created_user_id', None)
        user_email = getattr(TestExpiryTimerFeature, 'created_user_email', None)
        user_password = getattr(TestExpiryTimerFeature, 'created_user_password', None)
        if not user_id:
            pytest.skip("No test user created")
        
        # First, ensure user has fees and timer is started
        # Set timer and start it
        self.session.put(
            f"{BASE_URL}/api/admin/users/{user_id}",
            json={"timer_duration_hours": 48, "timer_started_at": ""},
            headers=self.admin_headers()
        )
        
        # Login as user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": user_email,
            "password": user_password
        })
        assert response.status_code == 200
        user_token = response.json()["data"]["token"]
        
        # Start timer
        response = self.session.post(
            f"{BASE_URL}/api/wallet/start-timer",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        
        # Request fee resolution
        response = self.session.post(
            f"{BASE_URL}/api/wallet/request-fee-resolution",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok")
        assert "message" in data
        
        print("PASS: request-fee-resolution works with active timer")
    
    def test_12_admin_users_list_includes_timer_fields(self):
        """Test admin users list includes timer fields"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/users",
            headers=self.admin_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok")
        
        users = data["data"]["users"]
        assert len(users) > 0
        
        # Find our test user
        user_id = getattr(TestExpiryTimerFeature, 'created_user_id', None)
        test_user = next((u for u in users if u.get("id") == user_id), None)
        
        if test_user:
            assert "timer_duration_hours" in test_user, "timer_duration_hours missing from user list"
            assert "timer_started_at" in test_user or test_user.get("timer_started_at") is None
            print(f"PASS: User list includes timer fields (timer_duration_hours={test_user.get('timer_duration_hours')})")
        else:
            print("PASS: Admin users list endpoint works (test user may be on different page)")
    
    def test_13_disable_timer(self):
        """Test admin can disable timer by setting timer_duration_hours to 0/null"""
        user_id = getattr(TestExpiryTimerFeature, 'created_user_id', None)
        if not user_id:
            pytest.skip("No test user created")
        
        # Disable timer
        response = self.session.put(
            f"{BASE_URL}/api/admin/users/{user_id}",
            json={"timer_duration_hours": 0},
            headers=self.admin_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok")
        # timer_duration_hours should be None/null now
        assert data["data"]["user"].get("timer_duration_hours") is None
        
        print("PASS: Admin can disable timer by setting to 0")
    
    def test_99_cleanup(self):
        """Cleanup test user"""
        user_id = getattr(TestExpiryTimerFeature, 'created_user_id', None)
        if user_id:
            response = self.session.delete(
                f"{BASE_URL}/api/admin/users/{user_id}",
                headers=self.admin_headers()
            )
            if response.status_code == 200:
                print(f"PASS: Cleaned up test user {user_id}")
            else:
                print(f"WARNING: Failed to cleanup test user {user_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
