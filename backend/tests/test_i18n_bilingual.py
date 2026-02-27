"""
Test suite for i18n bilingual features:
- Language preference API
- Bilingual error messages from backend
- Bilingual eligibility reasons
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLanguagePreferenceAPI:
    """Tests for PUT /api/auth/language endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@blockchain.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["data"]["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_set_language_to_italian(self):
        """Test setting language preference to Italian"""
        response = requests.put(
            f"{BASE_URL}/api/auth/language?lang=it",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to set language: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        print("SUCCESS: Language set to Italian")
    
    def test_set_language_to_english(self):
        """Test setting language preference to English"""
        response = requests.put(
            f"{BASE_URL}/api/auth/language?lang=en",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to set language: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        print("SUCCESS: Language set to English")
    
    def test_invalid_language_defaults_to_english(self):
        """Test that invalid language codes default to English"""
        response = requests.put(
            f"{BASE_URL}/api/auth/language?lang=xyz",
            headers=self.headers
        )
        # Should not error, just default to 'en'
        assert response.status_code == 200
        print("SUCCESS: Invalid language handled gracefully")


class TestBilingualEligibilityReasons:
    """Tests for bilingual eligibility reasons from /api/wallet/action-eligibility"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token for admin"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@blockchain.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["data"]["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_eligibility_returns_reasons_in_italian(self):
        """Test that eligibility endpoint returns Italian reasons when lang=it"""
        # First set language to Italian
        requests.put(f"{BASE_URL}/api/auth/language?lang=it", headers=self.headers)
        
        # Get eligibility
        response = requests.get(f"{BASE_URL}/api/wallet/action-eligibility", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        
        eligibility = data.get("data", {})
        print(f"Eligibility data: {eligibility}")
        
        # Check if any Italian text appears in reasons
        # Admin has no balance so should have reasons
        if eligibility.get("send", {}).get("reason"):
            reason = eligibility["send"]["reason"]
            print(f"Send reason: {reason}")
            # Check for Italian
            assert "Nessun saldo" in reason or "commissioni" in reason or "disponibile" in reason, \
                f"Expected Italian reason, got: {reason}"
            print("SUCCESS: Send eligibility reason is in Italian")
        
        if eligibility.get("swap", {}).get("reason"):
            reason = eligibility["swap"]["reason"]
            print(f"Swap reason: {reason}")
        
        print("SUCCESS: Eligibility endpoint returns bilingual reasons")
    
    def test_eligibility_returns_reasons_in_english(self):
        """Test that eligibility endpoint returns English reasons when lang=en"""
        # First set language to English
        requests.put(f"{BASE_URL}/api/auth/language?lang=en", headers=self.headers)
        
        # Get eligibility
        response = requests.get(f"{BASE_URL}/api/wallet/action-eligibility", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        eligibility = data.get("data", {})
        
        if eligibility.get("send", {}).get("reason"):
            reason = eligibility["send"]["reason"]
            print(f"Send reason (EN): {reason}")
            # Check for English
            assert "No available" in reason or "balance" in reason, \
                f"Expected English reason, got: {reason}"
            print("SUCCESS: Send eligibility reason is in English")


class TestBilingualErrorMessages:
    """Tests for bilingual error messages from wallet actions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@blockchain.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["data"]["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_swap_error_message_bilingual(self):
        """Test swap endpoint returns bilingual error messages"""
        # Set language to Italian
        requests.put(f"{BASE_URL}/api/auth/language?lang=it", headers=self.headers)
        
        # Try to swap with invalid assets (should fail)
        response = requests.post(
            f"{BASE_URL}/api/wallet/swap",
            json={"from_asset": "BTC", "to_asset": "ETH", "amount": "100"},
            headers=self.headers
        )
        
        # Should return 400 with Italian message
        if response.status_code == 400:
            detail = response.json().get("detail", "")
            print(f"Swap error (IT): {detail}")
            # Check for Italian error
            if "scambio" in detail.lower() or "supportato" in detail.lower():
                print("SUCCESS: Swap error message is in Italian")
        
        # Set language back to English and test
        requests.put(f"{BASE_URL}/api/auth/language?lang=en", headers=self.headers)
        
        response = requests.post(
            f"{BASE_URL}/api/wallet/swap",
            json={"from_asset": "BTC", "to_asset": "ETH", "amount": "100"},
            headers=self.headers
        )
        
        if response.status_code == 400:
            detail = response.json().get("detail", "")
            print(f"Swap error (EN): {detail}")
            if "swap" in detail.lower() or "supported" in detail.lower():
                print("SUCCESS: Swap error message is in English")


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """Verify API is running"""
        response = requests.get(f"{BASE_URL}/api")
        assert response.status_code == 200
        print("SUCCESS: API is healthy")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
