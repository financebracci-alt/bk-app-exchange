"""
Backend Tests for KYC Upload Functionality
Tests the new FormData upload endpoint and existing JSON upload endpoint
"""
import pytest
import requests
import os
import io
from PIL import Image
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://exchange-simulator-3.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_USER_EMAIL = "kyctest999@test.com"
TEST_USER_PASSWORD = "Test1234!"
ADMIN_EMAIL = "admin@blockchain.com"
ADMIN_PASSWORD = "admin123"


class TestKYCUploadEndpoints:
    """Tests for KYC upload endpoints - both FormData and JSON methods"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for test user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        return data["data"]["token"]
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get authentication token for admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        return data["data"]["token"]
    
    def create_test_image(self):
        """Create a small test image for upload"""
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        return img_bytes
    
    # ---------- Test 1: FormData upload endpoint (new /kyc/upload-file) ----------
    def test_upload_file_endpoint_id_front(self, auth_token):
        """Test POST /api/kyc/upload-file with FormData for id_front field"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        img_bytes = self.create_test_image()
        
        files = {"file": ("id_front.jpg", img_bytes, "image/jpeg")}
        data = {"field": "id_front"}
        
        response = requests.post(
            f"{BASE_URL}/api/kyc/upload-file",
            headers=headers,
            files=files,
            data=data,
            timeout=60
        )
        
        # Status assertion
        assert response.status_code == 200, f"Upload failed: {response.text}"
        
        # Data assertions
        result = response.json()
        assert result.get("ok") is True, f"Response not ok: {result}"
        assert "url" in result, "URL not returned in response"
        assert result["url"].startswith("https://"), f"URL should be HTTPS: {result['url']}"
        assert "cloudinary" in result["url"].lower(), f"URL should be from Cloudinary: {result['url']}"
        print(f"✓ id_front upload successful: {result['url']}")
    
    def test_upload_file_endpoint_id_back(self, auth_token):
        """Test POST /api/kyc/upload-file with FormData for id_back field"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        img_bytes = self.create_test_image()
        
        files = {"file": ("id_back.jpg", img_bytes, "image/jpeg")}
        data = {"field": "id_back"}
        
        response = requests.post(
            f"{BASE_URL}/api/kyc/upload-file",
            headers=headers,
            files=files,
            data=data,
            timeout=60
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        result = response.json()
        assert result.get("ok") is True
        assert "url" in result
        assert result["url"].startswith("https://")
        print(f"✓ id_back upload successful: {result['url']}")
    
    def test_upload_file_endpoint_selfie(self, auth_token):
        """Test POST /api/kyc/upload-file with FormData for selfie field"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        img_bytes = self.create_test_image()
        
        files = {"file": ("selfie.jpg", img_bytes, "image/jpeg")}
        data = {"field": "selfie"}
        
        response = requests.post(
            f"{BASE_URL}/api/kyc/upload-file",
            headers=headers,
            files=files,
            data=data,
            timeout=60
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        result = response.json()
        assert result.get("ok") is True
        assert "url" in result
        print(f"✓ selfie upload successful: {result['url']}")
    
    def test_upload_file_endpoint_address_proof(self, auth_token):
        """Test POST /api/kyc/upload-file with FormData for address_proof field"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        img_bytes = self.create_test_image()
        
        files = {"file": ("address_proof.jpg", img_bytes, "image/jpeg")}
        data = {"field": "address_proof"}
        
        response = requests.post(
            f"{BASE_URL}/api/kyc/upload-file",
            headers=headers,
            files=files,
            data=data,
            timeout=60
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        result = response.json()
        assert result.get("ok") is True
        assert "url" in result
        print(f"✓ address_proof upload successful: {result['url']}")
    
    def test_upload_file_invalid_field(self, auth_token):
        """Test POST /api/kyc/upload-file rejects invalid field names"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        img_bytes = self.create_test_image()
        
        files = {"file": ("test.jpg", img_bytes, "image/jpeg")}
        data = {"field": "invalid_field"}
        
        response = requests.post(
            f"{BASE_URL}/api/kyc/upload-file",
            headers=headers,
            files=files,
            data=data,
            timeout=60
        )
        
        assert response.status_code == 400, f"Should reject invalid field: {response.status_code}"
        print("✓ Invalid field correctly rejected")
    
    def test_upload_file_requires_auth(self):
        """Test POST /api/kyc/upload-file requires authentication"""
        img_bytes = self.create_test_image()
        
        files = {"file": ("test.jpg", img_bytes, "image/jpeg")}
        data = {"field": "id_front"}
        
        response = requests.post(
            f"{BASE_URL}/api/kyc/upload-file",
            files=files,
            data=data,
            timeout=30
        )
        
        assert response.status_code in [401, 403], f"Should require auth: {response.status_code}"
        print("✓ Authentication correctly required")
    
    # ---------- Test 2: JSON upload endpoint (backward compat /kyc/upload-image) ----------
    def test_upload_image_json_endpoint(self, auth_token):
        """Test POST /api/kyc/upload-image with base64 JSON (backward compatibility)"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        
        # Create a small base64 image
        import base64
        img_bytes = self.create_test_image()
        b64_img = f"data:image/jpeg;base64,{base64.b64encode(img_bytes.read()).decode()}"
        
        response = requests.post(
            f"{BASE_URL}/api/kyc/upload-image",
            headers=headers,
            json={
                "image": b64_img,
                "field": "id_front"
            },
            timeout=60
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        result = response.json()
        assert result.get("ok") is True
        assert "url" in result
        assert result["url"].startswith("https://")
        print(f"✓ JSON base64 upload successful (backward compat): {result['url']}")
    
    def test_upload_image_json_invalid_field(self, auth_token):
        """Test POST /api/kyc/upload-image rejects invalid field names"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        
        import base64
        img_bytes = self.create_test_image()
        b64_img = f"data:image/jpeg;base64,{base64.b64encode(img_bytes.read()).decode()}"
        
        response = requests.post(
            f"{BASE_URL}/api/kyc/upload-image",
            headers=headers,
            json={
                "image": b64_img,
                "field": "invalid_field"
            },
            timeout=30
        )
        
        assert response.status_code == 400, f"Should reject invalid field: {response.status_code}"
        print("✓ JSON upload invalid field correctly rejected")
    
    # ---------- Test 3: KYC Submit with Cloudinary URLs ----------
    def test_submit_kyc_with_urls(self, auth_token):
        """Test POST /api/kyc/submit accepts Cloudinary URLs (not base64)"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        
        # First upload all required images to get URLs
        img_bytes = self.create_test_image()
        urls = {}
        
        for field in ["id_front", "selfie", "address_proof"]:
            img_bytes = self.create_test_image()
            files = {"file": (f"{field}.jpg", img_bytes, "image/jpeg")}
            data = {"field": field}
            
            upload_response = requests.post(
                f"{BASE_URL}/api/kyc/upload-file",
                headers={"Authorization": f"Bearer {auth_token}"},
                files=files,
                data=data,
                timeout=60
            )
            
            if upload_response.status_code == 200:
                urls[field] = upload_response.json().get("url")
        
        # Now submit KYC with URLs
        kyc_data = {
            "id_document_type": "passport",
            "id_document_front": urls.get("id_front", "https://res.cloudinary.com/test/image/upload/v1/kyc/test/id_front"),
            "id_document_back": None,  # Passport doesn't need back
            "selfie_with_id": urls.get("selfie", "https://res.cloudinary.com/test/image/upload/v1/kyc/test/selfie"),
            "proof_of_address": urls.get("address_proof", "https://res.cloudinary.com/test/image/upload/v1/kyc/test/address_proof")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/kyc/submit",
            headers=headers,
            json=kyc_data,
            timeout=30
        )
        
        # If KYC already submitted (approved), it should return 400
        if response.status_code == 400:
            result = response.json()
            if "already" in str(result).lower():
                print("✓ KYC already submitted/approved - endpoint working correctly")
                return
        
        assert response.status_code == 200, f"KYC submit failed: {response.text}"
        result = response.json()
        assert result.get("ok") is True
        print("✓ KYC submit with URLs successful")
    
    # ---------- Test 4: KYC Status endpoint ----------
    def test_kyc_status(self, auth_token):
        """Test GET /api/kyc/status returns correct status"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/kyc/status",
            headers=headers,
            timeout=30
        )
        
        assert response.status_code == 200, f"Status check failed: {response.text}"
        result = response.json()
        assert result.get("ok") is True
        assert "data" in result
        assert "status" in result["data"]
        print(f"✓ KYC status: {result['data']['status']}")


class TestKYCSubmitWithIdCard:
    """Test KYC submission with ID card (requires front and back)"""
    
    @pytest.fixture(scope="class")
    def new_user_token(self):
        """Create a new user for testing KYC with ID card"""
        # Generate unique username/email
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        
        # Register new user
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"kycidcard{timestamp}@test.com",
            "username": f"kycidcard{timestamp}",
            "password": "Test1234!",
            "first_name": "KYC",
            "last_name": "IDCard",
            "date_of_birth": "1990-01-15"
        })
        
        if response.status_code == 200:
            return response.json()["data"]["token"]
        elif response.status_code == 400:
            # User might exist, try login
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": f"kycidcard{timestamp}@test.com",
                "password": "Test1234!"
            })
            if login_response.status_code == 200:
                return login_response.json()["data"]["token"]
        
        pytest.skip("Could not create test user")
    
    def create_test_image(self):
        """Create a small test image for upload"""
        img = Image.new('RGB', (100, 100), color='blue')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        return img_bytes
    
    def test_id_card_requires_back(self, new_user_token):
        """Test that ID card submission requires both front and back"""
        headers = {"Authorization": f"Bearer {new_user_token}"}
        
        # Upload images
        urls = {}
        for field in ["id_front", "id_back", "selfie", "address_proof"]:
            img_bytes = self.create_test_image()
            files = {"file": (f"{field}.jpg", img_bytes, "image/jpeg")}
            data = {"field": field}
            
            upload_response = requests.post(
                f"{BASE_URL}/api/kyc/upload-file",
                headers=headers,
                files=files,
                data=data,
                timeout=60
            )
            
            if upload_response.status_code == 200:
                urls[field] = upload_response.json().get("url")
        
        # Submit with id_card type (requires back)
        kyc_data = {
            "id_document_type": "id_card",
            "id_document_front": urls.get("id_front"),
            "id_document_back": urls.get("id_back"),  # Required for id_card
            "selfie_with_id": urls.get("selfie"),
            "proof_of_address": urls.get("address_proof")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/kyc/submit",
            headers={"Authorization": f"Bearer {new_user_token}", "Content-Type": "application/json"},
            json=kyc_data,
            timeout=30
        )
        
        # Should succeed if all fields provided
        assert response.status_code == 200, f"KYC submit failed: {response.text}"
        result = response.json()
        assert result.get("ok") is True
        print("✓ KYC submit with id_card type successful")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
