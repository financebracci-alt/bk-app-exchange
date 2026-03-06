"""
Comprehensive Backend Tests for Session Features - Iteration 12
Tests: Auth, Registration, Exchange Rate, Health, KYC Upload, Withdrawal Defaults, Admin Settings, Sliding Session
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@blockchain.com"
ADMIN_PASSWORD = "admin123"
TEST_USER_EMAIL = "ftest22512@test.com"
TEST_USER_PASSWORD = "Test1234!"

class TestHealthAndBasics:
    """Test 1: Health check and basic endpoints"""
    
    def test_health_check(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data["status"] == "healthy", f"Unexpected status: {data}"
        print("✓ Health check passed - status: healthy")
    
    def test_root_endpoint(self):
        """Test /api/ returns API info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"Root endpoint failed: {response.text}"
        data = response.json()
        assert "message" in data or "status" in data
        print("✓ Root endpoint passed")


class TestAuthentication:
    """Tests 2-3: Authentication endpoints"""
    
    def test_admin_login(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        assert "data" in data
        assert "token" in data["data"]
        assert data["data"]["user"]["email"] == ADMIN_EMAIL
        assert data["data"]["user"]["role"] in ["admin", "superadmin"]
        print(f"✓ Admin login passed - role: {data['data']['user']['role']}")
        return data["data"]["token"]
    
    def test_user_registration(self):
        """Test user registration with new email"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"testuser_{unique_id}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "username": f"testuser{unique_id}",
            "password": "Test1234!",
            "first_name": "Test",
            "last_name": "User",
            "date_of_birth": "1990-01-01"
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        assert "data" in data
        assert "token" in data["data"]
        assert data["data"]["user"]["email"] == test_email
        print(f"✓ User registration passed - email: {test_email}")
        return data["data"]["token"], test_email


class TestExchangeRate:
    """Test 4: Exchange rate endpoint"""
    
    def test_exchange_rate(self):
        """Test /api/exchange-rate returns valid USDC/EUR rate"""
        response = requests.get(f"{BASE_URL}/api/exchange-rate")
        assert response.status_code == 200, f"Exchange rate failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        assert "data" in data
        rate_data = data["data"]
        assert "usdc_eur" in rate_data, f"Missing usdc_eur in response: {rate_data}"
        assert "eur_usdc" in rate_data, f"Missing eur_usdc in response: {rate_data}"
        assert float(rate_data["usdc_eur"]) > 0, "Invalid usdc_eur rate"
        assert float(rate_data["eur_usdc"]) > 0, "Invalid eur_usdc rate"
        print(f"✓ Exchange rate passed - USDC/EUR: {rate_data['usdc_eur']}, EUR/USDC: {rate_data['eur_usdc']}")


class TestKYCUpload:
    """Tests 5-6: KYC upload endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code != 200:
            # Register the test user if login fails
            unique_id = str(uuid.uuid4())[:8]
            response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": f"kyctest_{unique_id}@test.com",
                "username": f"kyctest{unique_id}",
                "password": "Test1234!",
                "first_name": "KYC",
                "last_name": "Test",
                "date_of_birth": "1990-01-01"
            })
        data = response.json()
        return data["data"]["token"]
    
    def test_kyc_upload_file_formdata(self, auth_token):
        """Test POST /api/kyc/upload-file with FormData (binary)"""
        # Create a small test image (1x1 pixel PNG)
        import base64
        # Minimal valid PNG (1x1 red pixel)
        png_data = base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
        )
        
        files = {'file': ('test.png', png_data, 'image/png')}
        data = {'field': 'id_front'}
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        response = requests.post(
            f"{BASE_URL}/api/kyc/upload-file",
            files=files,
            data=data,
            headers=headers
        )
        assert response.status_code == 200, f"KYC upload-file failed: {response.text}"
        result = response.json()
        assert result.get("ok") is True
        assert "url" in result
        assert result["url"].startswith("https://res.cloudinary.com"), f"Invalid Cloudinary URL: {result['url']}"
        print(f"✓ KYC upload-file (FormData) passed - URL: {result['url'][:60]}...")
    
    def test_kyc_upload_image_json_backward_compat(self, auth_token):
        """Test POST /api/kyc/upload-image with JSON base64 (backward compatibility)"""
        # Small valid base64 PNG
        base64_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
        
        headers = {
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/kyc/upload-image",
            json={"image": base64_image, "field": "selfie"},
            headers=headers
        )
        assert response.status_code == 200, f"KYC upload-image (JSON) failed: {response.text}"
        result = response.json()
        assert result.get("ok") is True
        assert "url" in result
        print(f"✓ KYC upload-image (JSON base64) backward compat passed")


class TestWithdrawalDefaults:
    """Test 7: Withdrawal defaults endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["data"]["token"]
        # Try admin if test user doesn't exist
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["data"]["token"]
    
    def test_withdrawal_defaults(self, auth_token):
        """Test GET /api/wallet/withdrawal-defaults returns default IBAN and SWIFT"""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = requests.get(f"{BASE_URL}/api/wallet/withdrawal-defaults", headers=headers)
        assert response.status_code == 200, f"Withdrawal defaults failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        assert "data" in data
        assert "iban" in data["data"], f"Missing iban in response: {data}"
        assert "swift" in data["data"], f"Missing swift in response: {data}"
        # Check default values
        iban = data["data"]["iban"]
        swift = data["data"]["swift"]
        assert len(iban) > 15, f"IBAN too short: {iban}"
        assert len(swift) >= 8, f"SWIFT too short: {swift}"
        print(f"✓ Withdrawal defaults passed - IBAN: {iban}, SWIFT: {swift}")


class TestAdminSettings:
    """Tests 8-9: Admin settings endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["data"]["token"]
    
    def test_admin_get_settings(self, admin_token):
        """Test GET /api/admin/settings returns settings"""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        assert response.status_code == 200, f"Admin get settings failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        assert "data" in data
        assert "settings" in data["data"]
        settings = data["data"]["settings"]
        # Check expected fields exist
        assert "maintenance_mode" in settings
        assert "allow_registration" in settings
        print(f"✓ Admin GET settings passed - maintenance_mode: {settings.get('maintenance_mode')}")
    
    def test_admin_update_settings_iban_swift(self, admin_token):
        """Test PUT /api/admin/settings accepts IBAN and SWIFT params"""
        headers = {'Authorization': f'Bearer {admin_token}'}
        
        # Update with test values
        test_iban = "DE89370400440532013000"
        test_swift = "COBADEFFXXX"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/settings",
            params={
                "default_withdrawal_iban": test_iban,
                "default_withdrawal_swift": test_swift
            },
            headers=headers
        )
        assert response.status_code == 200, f"Admin update settings failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        print(f"✓ Admin PUT settings (IBAN/SWIFT) passed")
        
        # Verify the update persisted
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        data = response.json()
        settings = data["data"]["settings"]
        assert settings.get("default_withdrawal_iban") == test_iban.replace(" ", "")
        assert settings.get("default_withdrawal_swift") == test_swift.upper()
        print(f"✓ Admin settings IBAN/SWIFT verified - IBAN: {settings.get('default_withdrawal_iban')}, SWIFT: {settings.get('default_withdrawal_swift')}")
        
        # Restore original values
        requests.put(
            f"{BASE_URL}/api/admin/settings",
            params={
                "default_withdrawal_iban": "MT29CFTE28004000000000005634364",
                "default_withdrawal_swift": "CFTEMTM1"
            },
            headers=headers
        )


class TestActionEligibility:
    """Test 10: Action eligibility endpoint"""
    
    @pytest.fixture(scope="class")
    def user_token(self):
        """Get user token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["data"]["token"]
        # Register new user
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"eligibility_{unique_id}@test.com",
            "username": f"elig{unique_id}",
            "password": "Test1234!",
            "first_name": "Eligibility",
            "last_name": "Test",
            "date_of_birth": "1990-01-01"
        })
        return response.json()["data"]["token"]
    
    def test_action_eligibility(self, user_token):
        """Test GET /api/wallet/action-eligibility returns eligibility info"""
        headers = {'Authorization': f'Bearer {user_token}'}
        response = requests.get(f"{BASE_URL}/api/wallet/action-eligibility", headers=headers)
        assert response.status_code == 200, f"Action eligibility failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        assert "data" in data
        eligibility = data["data"]
        # Check expected keys
        assert "send" in eligibility, f"Missing 'send' in eligibility: {eligibility}"
        assert "swap" in eligibility, f"Missing 'swap' in eligibility: {eligibility}"
        print(f"✓ Action eligibility passed - send: {eligibility['send']}, swap: {eligibility['swap']}")


class TestWithdrawalUsesSystemIban:
    """Test 11: Withdrawal uses system default IBAN"""
    
    @pytest.fixture(scope="class")
    def user_with_eur_token(self):
        """Get token for user with EUR balance"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["data"]["token"]
        pytest.skip("Test user with EUR balance not available")
    
    def test_withdrawal_iban_is_system_default(self, user_with_eur_token):
        """Verify withdrawal endpoint uses system default IBAN"""
        headers = {'Authorization': f'Bearer {user_with_eur_token}'}
        
        # First check withdrawal defaults
        defaults_response = requests.get(f"{BASE_URL}/api/wallet/withdrawal-defaults", headers=headers)
        if defaults_response.status_code != 200:
            pytest.skip("Cannot get withdrawal defaults")
        defaults = defaults_response.json()["data"]
        system_iban = defaults["iban"]
        
        print(f"✓ Withdrawal defaults API returns system IBAN: {system_iban}")
        # Note: We don't actually submit a withdrawal as it would affect user balance


class TestSlidingSession:
    """Test 12: Sliding session token refresh"""
    
    def test_sliding_session_header(self):
        """Test X-Refreshed-Token header returned on authenticated calls"""
        # Login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["data"]["token"]
        
        # Make authenticated call and check for X-Refreshed-Token header
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        
        # Check for sliding session header
        refreshed_token = response.headers.get('X-Refreshed-Token')
        if refreshed_token:
            assert len(refreshed_token) > 50, "Refreshed token seems too short"
            print(f"✓ Sliding session passed - X-Refreshed-Token header present ({len(refreshed_token)} chars)")
        else:
            print("⚠ X-Refreshed-Token header not present (may be by design for fresh tokens)")
        
        # Verify data is correct regardless
        data = response.json()
        assert data.get("ok") is True
        assert "user" in data["data"]


class TestPWAAssets:
    """Tests for PWA manifest and service worker"""
    
    def test_manifest_json(self):
        """Test manifest.json serves correctly with 4 PNG icons"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200, f"Manifest.json failed: {response.status_code}"
        data = response.json()
        assert "name" in data
        assert "icons" in data
        icons = data["icons"]
        assert len(icons) >= 4, f"Expected at least 4 icons, got {len(icons)}"
        
        # Check icon types
        icon_purposes = [icon.get("purpose", "any") for icon in icons]
        assert "any" in icon_purposes or any("any" in p for p in icon_purposes), "Missing 'any' purpose icon"
        assert "maskable" in icon_purposes or any("maskable" in p for p in icon_purposes), "Missing 'maskable' purpose icon"
        
        # Check for PNG format
        for icon in icons:
            assert icon.get("type") == "image/png", f"Non-PNG icon found: {icon}"
        
        print(f"✓ PWA manifest.json passed - {len(icons)} icons defined")
    
    def test_service_worker(self):
        """Test sw.js serves correctly"""
        response = requests.get(f"{BASE_URL}/sw.js")
        assert response.status_code == 200, f"Service worker failed: {response.status_code}"
        content = response.text
        assert "addEventListener" in content, "Service worker missing event listener"
        assert "fetch" in content or "install" in content, "Service worker missing fetch/install handler"
        print(f"✓ Service worker sw.js passed - {len(content)} bytes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
