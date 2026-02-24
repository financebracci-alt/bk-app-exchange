#!/usr/bin/env python3
"""
Blockchain Wallet API Test Suite
Comprehensive testing for all API endpoints
"""

import requests
import json
import sys
from typing import Dict, Any, Optional
from datetime import datetime

class BlockchainWalletAPITester:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.admin_token = None
        self.user_token = None
        self.test_user_id = None
        
    def log(self, message: str, level: str = "INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    headers: Dict = None, token: str = None) -> Dict[str, Any]:
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}{endpoint}"
        
        # Setup headers
        request_headers = {"Content-Type": "application/json"}
        if headers:
            request_headers.update(headers)
        if token:
            request_headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=request_headers, params=data)
            elif method.upper() == "POST":
                response = self.session.post(url, headers=request_headers, json=data)
            elif method.upper() == "PUT":
                response = self.session.put(url, headers=request_headers, json=data)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=request_headers)
            else:
                return {"success": False, "error": f"Unsupported method: {method}"}
                
            # Parse response
            try:
                json_data = response.json()
            except json.JSONDecodeError:
                json_data = {"text": response.text}
                
            return {
                "success": 200 <= response.status_code < 300,
                "status_code": response.status_code,
                "data": json_data,
                "headers": dict(response.headers)
            }
            
        except requests.RequestException as e:
            return {"success": False, "error": str(e)}
    
    def test_health_endpoints(self) -> bool:
        """Test health check endpoints"""
        self.log("=== Testing Health Endpoints ===")
        
        # Test root endpoint
        result = self.make_request("GET", "/api/")
        if not result["success"]:
            self.log(f"❌ Root endpoint failed: {result.get('error')}", "ERROR")
            return False
            
        data = result["data"]
        if data.get("message") != "Blockchain Wallet API" or data.get("status") != "online":
            self.log(f"❌ Root endpoint response invalid: {data}", "ERROR")
            return False
            
        self.log("✅ Root endpoint working correctly")
        
        # Test health endpoint
        result = self.make_request("GET", "/api/health")
        if not result["success"]:
            self.log(f"❌ Health endpoint failed: {result.get('error')}", "ERROR")
            return False
            
        data = result["data"]
        if data.get("status") != "healthy":
            self.log(f"❌ Health endpoint response invalid: {data}", "ERROR")
            return False
            
        self.log("✅ Health endpoint working correctly")
        return True
    
    def test_admin_authentication(self) -> bool:
        """Test admin authentication"""
        self.log("=== Testing Admin Authentication ===")
        
        # Test admin login
        login_data = {
            "email": "admin@blockchain.com",
            "password": "admin123"
        }
        
        result = self.make_request("POST", "/api/auth/login", login_data)
        if not result["success"]:
            self.log(f"❌ Admin login failed: {result.get('error')} | Response: {result.get('data')}", "ERROR")
            return False
            
        data = result["data"]
        if not data.get("ok") or not data.get("data", {}).get("token"):
            self.log(f"❌ Admin login response invalid: {data}", "ERROR")
            return False
            
        self.admin_token = data["data"]["token"]
        self.log("✅ Admin authentication successful")
        
        # Test /auth/me with admin token
        result = self.make_request("GET", "/api/auth/me", token=self.admin_token)
        if not result["success"]:
            self.log(f"❌ Admin /auth/me failed: {result.get('error')}", "ERROR")
            return False
            
        data = result["data"]
        admin_user = data.get("data", {}).get("user", {})
        if admin_user.get("email") != "admin@blockchain.com" or admin_user.get("role") != "superadmin":
            self.log(f"❌ Admin /auth/me response invalid: {admin_user}", "ERROR")
            return False
            
        self.log("✅ Admin /auth/me working correctly")
        return True
    
    def test_user_registration(self) -> bool:
        """Test user registration"""
        self.log("=== Testing User Registration ===")
        
        # Generate unique test user data
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        user_data = {
            "email": f"testuser{timestamp}@example.com",
            "username": f"testuser{timestamp}",
            "password": "TestPass123",
            "first_name": "Test",
            "last_name": "User",
            "date_of_birth": "1990-01-15"
        }
        
        result = self.make_request("POST", "/api/auth/register", user_data)
        if not result["success"]:
            self.log(f"❌ User registration failed: {result.get('error')} | Response: {result.get('data')}", "ERROR")
            return False
            
        data = result["data"]
        if not data.get("ok") or not data.get("data", {}).get("token"):
            self.log(f"❌ User registration response invalid: {data}", "ERROR")
            return False
            
        self.user_token = data["data"]["token"]
        user_info = data["data"]["user"]
        self.test_user_id = user_info["id"]
        
        self.log(f"✅ User registration successful - User ID: {self.test_user_id}")
        return True
    
    def test_admin_user_creation(self) -> bool:
        """Test critical admin user creation endpoint"""
        self.log("=== Testing Admin User Creation (CRITICAL) ===")
        
        if not self.admin_token:
            self.log("❌ No admin token available", "ERROR")
            return False
            
        # Generate unique test data
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        user_data = {
            "first_name": "Test",
            "last_name": "User", 
            "email": f"testuser_admin{timestamp}@example.com",
            "username": f"testuser_admin{timestamp}",
            "password": "TestPass123",
            "date_of_birth": "1990-01-15",
            "initial_usdc_balance": "5000.00",
            "total_fees": "250.00",
            "transaction_start_date": "2024-01-01",
            "transaction_end_date": "2024-12-31",
            "freeze_type": "unusual_activity",
            "connected_app_name": "ECCOMBX Bank"
        }
        
        result = self.make_request("POST", "/api/admin/users", user_data, token=self.admin_token)
        if not result["success"]:
            self.log(f"❌ Admin user creation failed: {result.get('error')} | Response: {result.get('data')}", "ERROR")
            return False
            
        data = result["data"]
        if not data.get("ok") or not data.get("data", {}).get("user"):
            self.log(f"❌ Admin user creation response invalid: {data}", "ERROR")
            return False
            
        created_user = data["data"]["user"]
        created_wallets = data["data"]["wallets"]
        created_user_id = created_user["id"]
        
        self.log(f"✅ Admin user creation successful - User ID: {created_user_id}")
        
        # Verify user was created with correct balance
        usdc_wallet = next((w for w in created_wallets if w["asset"] == "USDC"), None)
        if not usdc_wallet or usdc_wallet["balance"] != "5000.00":
            self.log(f"❌ User wallet balance incorrect: {usdc_wallet}", "ERROR")
            return False
            
        self.log("✅ User created with correct USDC balance")
        
        # Verify transactions were generated
        result = self.make_request("GET", f"/api/admin/transactions?user_id={created_user_id}", 
                                 token=self.admin_token)
        if not result["success"]:
            self.log(f"❌ Failed to fetch user transactions: {result.get('error')} | Status: {result.get('status_code')} | Data: {result.get('data')}", "ERROR")
            return False
            
        transactions = result["data"]["data"]["transactions"]
        if not transactions:
            self.log("❌ No transactions generated for user", "ERROR")
            return False
            
        self.log(f"✅ Transactions auto-generated: {len(transactions)} transactions")
        
        # Verify freeze type is set
        if created_user["freeze_type"] != "unusual_activity":
            self.log(f"❌ Freeze type not set correctly: {created_user['freeze_type']}", "ERROR")
            return False
            
        self.log("✅ Freeze type set correctly")
        return True
    
    def test_admin_operations(self) -> bool:
        """Test admin dashboard and user management operations"""
        self.log("=== Testing Admin Operations ===")
        
        if not self.admin_token:
            self.log("❌ No admin token available", "ERROR")
            return False
            
        # Test admin users list
        result = self.make_request("GET", "/api/admin/users", token=self.admin_token)
        if not result["success"]:
            self.log(f"❌ Admin users list failed: {result.get('error')} | Status: {result.get('status_code')} | Data: {result.get('data')}", "ERROR")
            return False
            
        data = result["data"]
        if not data.get("ok") or "users" not in data.get("data", {}):
            self.log(f"❌ Admin users list response invalid: {data}", "ERROR")
            return False
            
        self.log("✅ Admin users list working")
        
        # Test admin stats
        result = self.make_request("GET", "/api/admin/stats", token=self.admin_token)
        if not result["success"]:
            self.log(f"❌ Admin stats failed: {result.get('error')}", "ERROR")
            return False
            
        data = result["data"]
        stats = data.get("data", {})
        required_stats = ["total_users", "active_users", "frozen_users", "total_transactions"]
        for stat in required_stats:
            if stat not in stats:
                self.log(f"❌ Missing stat in response: {stat}", "ERROR")
                return False
                
        self.log("✅ Admin stats working correctly")
        
        # Test user update if we have a test user
        if self.test_user_id:
            update_data = {"freeze_type": "inactivity"}
            result = self.make_request("PUT", f"/api/admin/users/{self.test_user_id}", 
                                     update_data, token=self.admin_token)
            if not result["success"]:
                self.log(f"❌ User update failed: {result.get('error')}", "ERROR")
                return False
                
            self.log("✅ User update working")
        
        # Test audit logs
        result = self.make_request("GET", "/api/admin/audit-logs", token=self.admin_token)
        if not result["success"]:
            self.log(f"❌ Audit logs failed: {result.get('error')}", "ERROR")
            return False
            
        data = result["data"]
        if not data.get("ok") or "logs" not in data.get("data", {}):
            self.log(f"❌ Audit logs response invalid: {data}", "ERROR")
            return False
            
        self.log("✅ Audit logs working")
        return True
    
    def test_user_wallet_operations(self) -> bool:
        """Test user wallet operations"""
        self.log("=== Testing User Wallet Operations ===")
        
        if not self.user_token:
            self.log("❌ No user token available", "ERROR")
            return False
            
        # Test wallet balance
        result = self.make_request("GET", "/api/wallet/balance", token=self.user_token)
        if not result["success"]:
            self.log(f"❌ Wallet balance failed: {result.get('error')}", "ERROR")
            return False
            
        data = result["data"]
        if not data.get("ok") or "wallets" not in data.get("data", {}):
            self.log(f"❌ Wallet balance response invalid: {data}", "ERROR")
            return False
            
        wallets = data["data"]["wallets"]
        if not isinstance(wallets, list) or len(wallets) == 0:
            self.log(f"❌ No wallets found in response: {wallets}", "ERROR")
            return False
            
        self.log("✅ Wallet balance working")
        
        # Test transaction history
        result = self.make_request("GET", "/api/wallet/transactions", token=self.user_token)
        if not result["success"]:
            self.log(f"❌ Transaction history failed: {result.get('error')}", "ERROR")
            return False
            
        data = result["data"]
        if not data.get("ok") or "transactions" not in data.get("data", {}):
            self.log(f"❌ Transaction history response invalid: {data}", "ERROR")
            return False
            
        self.log("✅ Transaction history working")
        
        # Test unpaid fees
        result = self.make_request("GET", "/api/wallet/unpaid-fees", token=self.user_token)
        if not result["success"]:
            self.log(f"❌ Unpaid fees failed: {result.get('error')}", "ERROR")
            return False
            
        data = result["data"]
        if not data.get("ok") or "total_unpaid_fees" not in data.get("data", {}):
            self.log(f"❌ Unpaid fees response invalid: {data}", "ERROR")
            return False
            
        self.log("✅ Unpaid fees working")
        return True
    
    def test_authentication_failures(self) -> bool:
        """Test authentication edge cases and failures"""
        self.log("=== Testing Authentication Failures ===")
        
        # Test invalid login
        invalid_login = {
            "email": "invalid@example.com",
            "password": "wrongpassword"
        }
        
        result = self.make_request("POST", "/api/auth/login", invalid_login)
        if result["success"] or result["status_code"] != 401:
            self.log(f"❌ Invalid login should fail with 401: {result}", "ERROR")
            return False
            
        self.log("✅ Invalid login properly rejected")
        
        # Test protected endpoint without token
        result = self.make_request("GET", "/api/auth/me")
        if result["success"] or result["status_code"] not in [401, 403]:
            self.log(f"❌ Protected endpoint should require auth: {result}", "ERROR")
            return False
            
        self.log("✅ Protected endpoint requires authentication")
        
        # Test admin endpoint with user token (if available)
        if self.user_token:
            result = self.make_request("GET", "/api/admin/users", token=self.user_token)
            if result["success"] or result["status_code"] != 403:
                self.log(f"❌ Admin endpoint should reject user token: {result}", "ERROR")
                return False
                
            self.log("✅ Admin endpoint properly restricts access")
        
        return True
    
    def run_all_tests(self) -> Dict[str, bool]:
        """Run all test suites"""
        self.log("Starting Blockchain Wallet API Test Suite")
        self.log(f"Base URL: {self.base_url}")
        
        results = {}
        
        # Run tests in order
        test_suites = [
            ("Health Endpoints", self.test_health_endpoints),
            ("Admin Authentication", self.test_admin_authentication),
            ("User Registration", self.test_user_registration),
            ("Admin User Creation (CRITICAL)", self.test_admin_user_creation),
            ("Admin Operations", self.test_admin_operations),
            ("User Wallet Operations", self.test_user_wallet_operations),
            ("Authentication Failures", self.test_authentication_failures),
        ]
        
        for suite_name, test_func in test_suites:
            self.log(f"\n{'='*60}")
            try:
                results[suite_name] = test_func()
            except Exception as e:
                self.log(f"❌ Test suite '{suite_name}' crashed: {str(e)}", "ERROR")
                results[suite_name] = False
            
        # Summary
        self.log(f"\n{'='*60}")
        self.log("TEST SUMMARY")
        self.log(f"{'='*60}")
        
        passed = 0
        total = len(results)
        
        for suite_name, passed_test in results.items():
            status = "✅ PASSED" if passed_test else "❌ FAILED"
            self.log(f"{suite_name}: {status}")
            if passed_test:
                passed += 1
                
        self.log(f"\nOverall Result: {passed}/{total} test suites passed")
        
        if passed == total:
            self.log("🎉 ALL TESTS PASSED!")
        else:
            self.log("⚠️  SOME TESTS FAILED - Check logs above for details")
            
        return results


def main():
    """Main test runner"""
    # Use the configured backend URL from frontend .env
    base_url = "https://crypto-wallet-pro-4.preview.emergentagent.com"
    
    tester = BlockchainWalletAPITester(base_url)
    results = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    failed_tests = [name for name, passed in results.items() if not passed]
    if failed_tests:
        print(f"\nFailed tests: {failed_tests}")
        sys.exit(1)
    else:
        print("\nAll tests passed!")
        sys.exit(0)


if __name__ == "__main__":
    main()