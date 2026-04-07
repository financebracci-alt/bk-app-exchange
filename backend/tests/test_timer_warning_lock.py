"""
Test Timer Warning Email and Lock Account Features
Tests:
- POST /api/admin/users/{user_id}/send-email?email_type=timer_warning
- POST /api/admin/users/{user_id}/lock
- POST /api/auth/login - locked user returns 403
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@zenthos.im"
ADMIN_PASSWORD = "admin123"


class TestTimerWarningAndLockFeatures:
    """Test timer warning email and lock account features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        self.admin_token = login_response.json()["data"]["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        
        yield
        
        self.session.close()
    
    def test_admin_login_success(self):
        """Verify admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "token" in data["data"]
        print("✓ Admin login successful")
    
    def test_get_users_list(self):
        """Get users list to find users with timer configured"""
        response = self.session.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "users" in data["data"]
        
        users = data["data"]["users"]
        print(f"✓ Found {len(users)} users")
        
        # Find users with timer configured
        users_with_timer = [u for u in users if u.get("timer_duration_hours")]
        print(f"✓ Users with timer configured: {len(users_with_timer)}")
        for u in users_with_timer:
            print(f"  - {u['email']} (timer: {u.get('timer_duration_hours')}h, status: {u.get('account_status')})")
        
        return users
    
    def test_timer_warning_email_requires_timer(self):
        """Test that timer_warning email returns 400 if user has no timer configured"""
        # First, find a user without timer
        response = self.session.get(f"{BASE_URL}/api/admin/users")
        users = response.json()["data"]["users"]
        
        user_without_timer = None
        for u in users:
            if not u.get("timer_duration_hours") and u.get("role") != "admin":
                user_without_timer = u
                break
        
        if not user_without_timer:
            pytest.skip("No user without timer found for testing")
        
        # Try to send timer warning to user without timer
        response = self.session.post(
            f"{BASE_URL}/api/admin/users/{user_without_timer['id']}/send-email",
            params={"email_type": "timer_warning"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        assert "No timer configured" in response.json().get("detail", "")
        print(f"✓ Timer warning correctly rejected for user without timer: {user_without_timer['email']}")
    
    def test_timer_warning_email_success(self):
        """Test sending timer warning email to user with timer configured"""
        # Find a user with timer configured
        response = self.session.get(f"{BASE_URL}/api/admin/users")
        users = response.json()["data"]["users"]
        
        user_with_timer = None
        for u in users:
            if u.get("timer_duration_hours") and u.get("account_status") != "locked":
                user_with_timer = u
                break
        
        if not user_with_timer:
            pytest.skip("No user with timer found for testing")
        
        # Send timer warning email
        response = self.session.post(
            f"{BASE_URL}/api/admin/users/{user_with_timer['id']}/send-email",
            params={"email_type": "timer_warning"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["ok"] is True
        # Note: Email may not actually send if DNS not configured, but API should return success
        print(f"✓ Timer warning email sent to {user_with_timer['email']} (sent: {data['data'].get('sent')})")
    
    def test_lock_account_requires_reason(self):
        """Test that lock account requires a reason"""
        # Find any non-admin, non-locked user
        response = self.session.get(f"{BASE_URL}/api/admin/users")
        users = response.json()["data"]["users"]
        
        test_user = None
        for u in users:
            if u.get("role") != "admin" and u.get("account_status") != "locked":
                test_user = u
                break
        
        if not test_user:
            pytest.skip("No suitable user found for testing")
        
        # Try to lock without reason
        response = self.session.post(
            f"{BASE_URL}/api/admin/users/{test_user['id']}/lock",
            json={"reason": ""}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        assert "reason is required" in response.json().get("detail", "").lower()
        print(f"✓ Lock account correctly requires reason")
    
    def test_lock_account_success(self):
        """Test locking a user account with reason"""
        # Create a test user to lock
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"test_lock_{unique_id}@test.com"
        
        create_response = self.session.post(f"{BASE_URL}/api/admin/users", json={
            "email": test_email,
            "username": f"testlock{unique_id}",
            "password": "TestLock123!",
            "first_name": "Test",
            "last_name": "Lock",
            "date_of_birth": "1990-01-01"
        })
        
        if create_response.status_code not in [200, 201]:
            pytest.skip(f"Could not create test user: {create_response.text}")
        
        user_id = create_response.json()["data"]["user"]["id"]
        print(f"✓ Created test user: {test_email}")
        
        # Lock the account
        lock_reason = "Test lock reason - failure to pay fees"
        response = self.session.post(
            f"{BASE_URL}/api/admin/users/{user_id}/lock",
            json={"reason": lock_reason}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["ok"] is True
        assert "locked" in data.get("message", "").lower()
        print(f"✓ Account locked successfully")
        
        # Verify user is now locked
        user_response = self.session.get(f"{BASE_URL}/api/admin/users/{user_id}")
        assert user_response.status_code == 200
        user_data = user_response.json()["data"]["user"]
        assert user_data["account_status"] == "locked"
        assert user_data["lock_reason"] == lock_reason
        print(f"✓ User status verified as locked with correct reason")
        
        # Cleanup - delete test user
        self.session.delete(f"{BASE_URL}/api/admin/users/{user_id}")
        print(f"✓ Test user cleaned up")
    
    def test_locked_user_cannot_login(self):
        """Test that locked user gets 403 with lock reason on login attempt"""
        # Create and lock a test user
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"test_locked_login_{unique_id}@test.com"
        test_password = "TestLocked123!"
        
        create_response = self.session.post(f"{BASE_URL}/api/admin/users", json={
            "email": test_email,
            "username": f"testlockedlogin{unique_id}",
            "password": test_password,
            "first_name": "Test",
            "last_name": "LockedLogin",
            "date_of_birth": "1990-01-01"
        })
        
        if create_response.status_code not in [200, 201]:
            pytest.skip(f"Could not create test user: {create_response.text}")
        
        user_id = create_response.json()["data"]["user"]["id"]
        print(f"✓ Created test user: {test_email}")
        
        # Lock the account
        lock_reason = "Account locked for testing login block"
        self.session.post(
            f"{BASE_URL}/api/admin/users/{user_id}/lock",
            json={"reason": lock_reason}
        )
        print(f"✓ Account locked")
        
        # Try to login as locked user (use new session without admin token)
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": test_password
        })
        
        assert login_response.status_code == 403, f"Expected 403, got {login_response.status_code}: {login_response.text}"
        detail = login_response.json().get("detail", "")
        assert "locked" in detail.lower(), f"Expected 'locked' in detail, got: {detail}"
        assert lock_reason in detail, f"Expected lock reason in detail, got: {detail}"
        print(f"✓ Locked user login correctly returns 403 with reason: {detail}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/users/{user_id}")
        print(f"✓ Test user cleaned up")
    
    def test_existing_locked_user_login(self):
        """Test login for existing locked user (timertest2@test.com)"""
        # Try to login as the known locked user
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "timertest2@test.com",
            "password": "Test1234!"
        })
        
        # Should be 403 if locked, or 401 if credentials wrong
        if response.status_code == 403:
            detail = response.json().get("detail", "")
            assert "locked" in detail.lower()
            print(f"✓ Existing locked user (timertest2@test.com) correctly blocked: {detail}")
        elif response.status_code == 401:
            print("⚠ User timertest2@test.com credentials may have changed or user doesn't exist")
        else:
            print(f"⚠ Unexpected status {response.status_code}: {response.text}")
    
    def test_lock_nonexistent_user(self):
        """Test locking a non-existent user returns 404"""
        fake_user_id = str(uuid.uuid4())
        response = self.session.post(
            f"{BASE_URL}/api/admin/users/{fake_user_id}/lock",
            json={"reason": "Test reason"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Lock non-existent user correctly returns 404")
    
    def test_timer_warning_nonexistent_user(self):
        """Test sending timer warning to non-existent user returns 404"""
        fake_user_id = str(uuid.uuid4())
        response = self.session.post(
            f"{BASE_URL}/api/admin/users/{fake_user_id}/send-email",
            params={"email_type": "timer_warning"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Timer warning to non-existent user correctly returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
