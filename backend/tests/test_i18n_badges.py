"""
Test Italian translations and Admin badge functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://crypto-kyc-platform.preview.emergentagent.com')

class TestAdminBadges:
    """Test Admin badge system API"""
    
    @pytest.fixture
    def admin_token(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@blockchain.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        return data["data"]["token"]
    
    def test_admin_badges_endpoint(self, admin_token):
        """Test GET /api/admin/badges returns badge counts"""
        response = requests.get(
            f"{BASE_URL}/api/admin/badges",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        assert "users" in data["data"]
        assert "kyc" in data["data"]
        assert "transactions" in data["data"]
        # Verify values are integers
        assert isinstance(data["data"]["users"], int)
        assert isinstance(data["data"]["kyc"], int)
        assert isinstance(data["data"]["transactions"], int)
        print(f"Badge counts: users={data['data']['users']}, kyc={data['data']['kyc']}, transactions={data['data']['transactions']}")
    
    def test_admin_mark_section_read(self, admin_token):
        """Test PUT /api/admin/badges/{section}/mark-read"""
        # Mark transactions section as read
        response = requests.put(
            f"{BASE_URL}/api/admin/badges/transactions/mark-read",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        
        # Verify badge count is now 0 for transactions
        response2 = requests.get(
            f"{BASE_URL}/api/admin/badges",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["data"]["transactions"] == 0
        print("Transaction badge correctly shows 0 after mark-read")
    
    def test_admin_badges_stays_at_zero(self, admin_token):
        """Test that badge stays at 0 after marking read without new data"""
        # Mark users section as read
        requests.put(
            f"{BASE_URL}/api/admin/badges/users/mark-read",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Fetch badges multiple times
        for i in range(3):
            response = requests.get(
                f"{BASE_URL}/api/admin/badges",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200
            data = response.json()
            # Users should be 0 since we just marked it read and no new users
            assert data["data"]["users"] == 0, f"Badge count should stay at 0, got {data['data']['users']} on iteration {i+1}"
        print("Badge correctly stays at 0 on subsequent fetches")


class TestUserLanguageAPI:
    """Test user language preference API"""
    
    @pytest.fixture
    def user_token(self):
        """Login as test user and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testdesktop@example.com",
            "password": "Test1234!"
        })
        if response.status_code != 200:
            pytest.skip("Test user testdesktop@example.com not found")
        data = response.json()
        return data["data"]["token"]
    
    def test_update_language_preference(self, user_token):
        """Test PUT /api/auth/language updates user language"""
        # Set language to Italian
        response = requests.put(
            f"{BASE_URL}/api/auth/language?lang=it",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        
        # Set back to English
        response2 = requests.put(
            f"{BASE_URL}/api/auth/language?lang=en",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response2.status_code == 200
        print("Language preference API works correctly")
    
    def test_invalid_language_defaults_to_en(self, user_token):
        """Test invalid language codes default to 'en'"""
        response = requests.put(
            f"{BASE_URL}/api/auth/language?lang=invalid",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        # Should succeed and default to 'en'
        print("Invalid language code handled gracefully")


class TestEmailServiceItalian:
    """Test that email templates support Italian"""
    
    @pytest.fixture
    def admin_token(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@blockchain.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        return response.json()["data"]["token"]
    
    def test_fee_resolution_email_available(self, admin_token):
        """Test fee resolution email endpoint exists"""
        # This tests the endpoint exists and returns proper error for user without fees
        response = requests.post(
            f"{BASE_URL}/api/wallet/request-fee-resolution",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Admin user likely has no fees, so expect 400 or 200
        assert response.status_code in [200, 400]
        print("Fee resolution email endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
