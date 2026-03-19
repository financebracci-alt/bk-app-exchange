#!/usr/bin/env python3
"""
Comprehensive backend testing for Zenthos Wallet Platform admin transaction creation
Focus: Testing the bug fix for withdrawal transaction type
"""

import requests
import json
import time
import os
from decimal import Decimal

# Backend URL from frontend/.env
BACKEND_URL = "https://change-preview-3.preview.emergentagent.com/api"

# Admin credentials
ADMIN_EMAIL = "admin@eu-zenthos.com"
ADMIN_PASSWORD = "admin123"

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "errors": []
}

def log_result(test_name, success, message=""):
    if success:
        print(f"✅ {test_name}")
        test_results["passed"] += 1
    else:
        print(f"❌ {test_name} - {message}")
        test_results["failed"] += 1
        test_results["errors"].append(f"{test_name}: {message}")

def admin_login():
    """Login as admin and get JWT token"""
    try:
        response = requests.post(f"{BACKEND_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") and "data" in data and "token" in data["data"]:
                log_result("Admin Login", True, "Successfully logged in")
                return data["data"]["token"]
            else:
                log_result("Admin Login", False, f"Invalid response format: {data}")
                return None
        else:
            log_result("Admin Login", False, f"Status {response.status_code}: {response.text}")
            return None
    except Exception as e:
        log_result("Admin Login", False, f"Exception: {str(e)}")
        return None

def create_test_user(token):
    """Create a test user for transaction testing"""
    try:
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        # Create user with $10,000 initial USDC balance
        user_data = {
            "email": f"testuser-{int(time.time())}@test.com",
            "username": f"testuser{int(time.time())}",
            "password": "TestPassword123!",
            "first_name": "Test",
            "last_name": "User",
            "date_of_birth": "1990-01-01",
            "phone": "+1234567890",
            "role": "user",
            "freeze_type": "none",
            "initial_usdc_balance": "10000.00",
            "initial_eur_balance": "5000.00"
        }
        
        response = requests.post(f"{BACKEND_URL}/admin/users", json=user_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") and "data" in data:
                user_id = data["data"]["user"]["id"]
                log_result("Create Test User", True, f"User ID: {user_id}")
                return user_id
            else:
                log_result("Create Test User", False, f"Invalid response: {data}")
                return None
        else:
            log_result("Create Test User", False, f"Status {response.status_code}: {response.text}")
            return None
    except Exception as e:
        log_result("Create Test User", False, f"Exception: {str(e)}")
        return None

def test_withdrawal_transaction_usdc(token, user_id):
    """Test withdrawal transaction with USDC - should succeed and deduct from wallet balance"""
    try:
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        # Get user's current USDC balance
        response = requests.get(f"{BACKEND_URL}/admin/users/{user_id}", headers=headers)
        if response.status_code != 200:
            log_result("Get User Balance (Pre-Withdrawal)", False, f"Status {response.status_code}")
            return False
        
        user_data = response.json()["data"]
        usdc_wallet = next((w for w in user_data["wallets"] if w["asset"] == "USDC"), None)
        if not usdc_wallet:
            log_result("Get User Balance (Pre-Withdrawal)", False, "No USDC wallet found")
            return False
        
        initial_balance = Decimal(usdc_wallet["balance"])
        print(f"Initial USDC balance: ${initial_balance}")
        
        # Create withdrawal transaction
        tx_data = {
            "user_id": user_id,
            "type": "withdrawal",
            "asset": "USDC",
            "amount": "500.00",
            "fee": "5.00",
            "fee_paid": False,
            "status": "completed",
            "description": "Test withdrawal transaction",
            "counterparty_address": "0x1234567890abcdef1234567890abcdef12345678"
        }
        
        response = requests.post(f"{BACKEND_URL}/admin/transactions", json=tx_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                # Verify wallet balance was deducted
                response = requests.get(f"{BACKEND_URL}/admin/users/{user_id}", headers=headers)
                if response.status_code == 200:
                    user_data = response.json()["data"]
                    usdc_wallet = next((w for w in user_data["wallets"] if w["asset"] == "USDC"), None)
                    final_balance = Decimal(usdc_wallet["balance"])
                    expected_balance = initial_balance - Decimal("500.00")
                    
                    if final_balance == expected_balance:
                        log_result("Withdrawal Transaction USDC", True, f"Balance correctly deducted: ${initial_balance} -> ${final_balance}")
                        return True
                    else:
                        log_result("Withdrawal Transaction USDC", False, f"Balance incorrect: Expected ${expected_balance}, got ${final_balance}")
                        return False
                else:
                    log_result("Withdrawal Transaction USDC", False, "Failed to verify final balance")
                    return False
            else:
                log_result("Withdrawal Transaction USDC", False, f"Transaction failed: {data}")
                return False
        else:
            log_result("Withdrawal Transaction USDC", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_result("Withdrawal Transaction USDC", False, f"Exception: {str(e)}")
        return False

def test_withdrawal_transaction_eur(token, user_id):
    """Test withdrawal transaction with EUR - should succeed"""
    try:
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        tx_data = {
            "user_id": user_id,
            "type": "withdrawal",
            "asset": "EUR",
            "amount": "100.00",
            "fee": "2.00",
            "fee_paid": True,
            "status": "completed",
            "description": "Test EUR withdrawal transaction",
            "counterparty_address": "IBAN123456789"
        }
        
        response = requests.post(f"{BACKEND_URL}/admin/transactions", json=tx_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                log_result("Withdrawal Transaction EUR", True, "Transaction created successfully")
                return True
            else:
                log_result("Withdrawal Transaction EUR", False, f"Transaction failed: {data}")
                return False
        else:
            log_result("Withdrawal Transaction EUR", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_result("Withdrawal Transaction EUR", False, f"Exception: {str(e)}")
        return False

def test_deposit_transaction_usdc(token, user_id):
    """Test deposit transaction with USDC - should succeed and add to wallet balance"""
    try:
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        # Get user's current USDC balance
        response = requests.get(f"{BACKEND_URL}/admin/users/{user_id}", headers=headers)
        if response.status_code != 200:
            log_result("Get User Balance (Pre-Deposit)", False, f"Status {response.status_code}")
            return False
        
        user_data = response.json()["data"]
        usdc_wallet = next((w for w in user_data["wallets"] if w["asset"] == "USDC"), None)
        initial_balance = Decimal(usdc_wallet["balance"])
        print(f"Pre-deposit USDC balance: ${initial_balance}")
        
        # Create deposit transaction
        tx_data = {
            "user_id": user_id,
            "type": "deposit",
            "asset": "USDC",
            "amount": "1000.00",
            "fee": "0.00",
            "fee_paid": True,
            "status": "completed",
            "description": "Test deposit transaction",
            "counterparty_address": "0xabcdef1234567890abcdef1234567890abcdef12"
        }
        
        response = requests.post(f"{BACKEND_URL}/admin/transactions", json=tx_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                # Verify wallet balance was increased
                response = requests.get(f"{BACKEND_URL}/admin/users/{user_id}", headers=headers)
                if response.status_code == 200:
                    user_data = response.json()["data"]
                    usdc_wallet = next((w for w in user_data["wallets"] if w["asset"] == "USDC"), None)
                    final_balance = Decimal(usdc_wallet["balance"])
                    expected_balance = initial_balance + Decimal("1000.00")
                    
                    if final_balance == expected_balance:
                        log_result("Deposit Transaction USDC", True, f"Balance correctly increased: ${initial_balance} -> ${final_balance}")
                        return True
                    else:
                        log_result("Deposit Transaction USDC", False, f"Balance incorrect: Expected ${expected_balance}, got ${final_balance}")
                        return False
                else:
                    log_result("Deposit Transaction USDC", False, "Failed to verify final balance")
                    return False
            else:
                log_result("Deposit Transaction USDC", False, f"Transaction failed: {data}")
                return False
        else:
            log_result("Deposit Transaction USDC", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_result("Deposit Transaction USDC", False, f"Exception: {str(e)}")
        return False

def test_empty_fee_field(token, user_id):
    """Test with empty fee field - should default to '0.00' and succeed"""
    try:
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        tx_data = {
            "user_id": user_id,
            "type": "deposit",
            "asset": "USDC",
            "amount": "50.00",
            "fee": "",  # Empty fee - should default to "0.00"
            "fee_paid": True,
            "status": "completed",
            "description": "Test empty fee field",
            "counterparty_address": "0x1111222233334444555566667777888899990000"
        }
        
        response = requests.post(f"{BACKEND_URL}/admin/transactions", json=tx_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                # Check the created transaction has fee = "0.00"
                tx = data["data"]["transaction"]
                if tx["fee"] == "0.00":
                    log_result("Empty Fee Field Test", True, "Empty fee defaulted to 0.00")
                    return True
                else:
                    log_result("Empty Fee Field Test", False, f"Fee not defaulted correctly: {tx['fee']}")
                    return False
            else:
                log_result("Empty Fee Field Test", False, f"Transaction failed: {data}")
                return False
        else:
            log_result("Empty Fee Field Test", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_result("Empty Fee Field Test", False, f"Exception: {str(e)}")
        return False

def test_empty_amount_field(token, user_id):
    """Test with empty amount field - should default to '0.00' and succeed"""
    try:
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        tx_data = {
            "user_id": user_id,
            "type": "deposit",
            "asset": "USDC",
            "amount": "",  # Empty amount - should default to "0.00"
            "fee": "1.00",
            "fee_paid": False,
            "status": "completed",
            "description": "Test empty amount field",
            "counterparty_address": "0x2222333344445555666677778888999900001111"
        }
        
        response = requests.post(f"{BACKEND_URL}/admin/transactions", json=tx_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                # Check the created transaction has amount = "0.00"
                tx = data["data"]["transaction"]
                if tx["amount"] == "0.00":
                    log_result("Empty Amount Field Test", True, "Empty amount defaulted to 0.00")
                    return True
                else:
                    log_result("Empty Amount Field Test", False, f"Amount not defaulted correctly: {tx['amount']}")
                    return False
            else:
                log_result("Empty Amount Field Test", False, f"Transaction failed: {data}")
                return False
        else:
            log_result("Empty Amount Field Test", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_result("Empty Amount Field Test", False, f"Exception: {str(e)}")
        return False

def test_invalid_amount(token, user_id):
    """Test with invalid amount - should return 400 error with clear message"""
    try:
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        tx_data = {
            "user_id": user_id,
            "type": "deposit",
            "asset": "USDC",
            "amount": "abc",  # Invalid amount
            "fee": "1.00",
            "fee_paid": False,
            "status": "completed",
            "description": "Test invalid amount",
            "counterparty_address": "0x3333444455556666777788889999000011112222"
        }
        
        response = requests.post(f"{BACKEND_URL}/admin/transactions", json=tx_data, headers=headers)
        
        if response.status_code == 400:
            data = response.json()
            if "Invalid amount or fee value" in data.get("detail", ""):
                log_result("Invalid Amount Test", True, "Correctly returned 400 with validation message")
                return True
            else:
                log_result("Invalid Amount Test", False, f"Wrong error message: {data}")
                return False
        else:
            log_result("Invalid Amount Test", False, f"Expected 400, got {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_result("Invalid Amount Test", False, f"Exception: {str(e)}")
        return False

def test_invalid_asset_type(token, user_id):
    """Test with invalid asset type - should return 422 validation error"""
    try:
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        tx_data = {
            "user_id": user_id,
            "type": "deposit",
            "asset": "ETH",  # Invalid asset (not in enum)
            "amount": "100.00",
            "fee": "1.00",
            "fee_paid": False,
            "status": "completed",
            "description": "Test invalid asset type",
            "counterparty_address": "0x4444555566667777888899990000111122223333"
        }
        
        response = requests.post(f"{BACKEND_URL}/admin/transactions", json=tx_data, headers=headers)
        
        if response.status_code == 422:
            log_result("Invalid Asset Type Test", True, "Correctly returned 422 validation error")
            return True
        else:
            log_result("Invalid Asset Type Test", False, f"Expected 422, got {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_result("Invalid Asset Type Test", False, f"Exception: {str(e)}")
        return False

def test_invalid_transaction_type(token, user_id):
    """Test with invalid transaction type - should return 422 validation error"""
    try:
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        tx_data = {
            "user_id": user_id,
            "type": "transfer",  # Invalid type (not in enum)
            "asset": "USDC",
            "amount": "100.00",
            "fee": "1.00",
            "fee_paid": False,
            "status": "completed",
            "description": "Test invalid transaction type",
            "counterparty_address": "0x5555666677778888999900001111222233334444"
        }
        
        response = requests.post(f"{BACKEND_URL}/admin/transactions", json=tx_data, headers=headers)
        
        if response.status_code == 422:
            log_result("Invalid Transaction Type Test", True, "Correctly returned 422 validation error")
            return True
        else:
            log_result("Invalid Transaction Type Test", False, f"Expected 422, got {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_result("Invalid Transaction Type Test", False, f"Exception: {str(e)}")
        return False

def test_admin_stats(token):
    """Test GET /api/admin/stats - should return valid stats without errors"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BACKEND_URL}/admin/stats", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") and "data" in data:
                stats = data["data"]
                required_fields = [
                    "total_users", "active_users", "frozen_users", "pending_kyc",
                    "total_transactions", "total_usdc_balance", "total_eur_balance", "total_unpaid_fees"
                ]
                
                missing_fields = [field for field in required_fields if field not in stats]
                if not missing_fields:
                    log_result("Admin Stats API", True, f"All required fields present: {list(stats.keys())}")
                    return True
                else:
                    log_result("Admin Stats API", False, f"Missing fields: {missing_fields}")
                    return False
            else:
                log_result("Admin Stats API", False, f"Invalid response format: {data}")
                return False
        else:
            log_result("Admin Stats API", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_result("Admin Stats API", False, f"Exception: {str(e)}")
        return False

def test_user_balance_verification(token, user_id):
    """Verify the user's wallet balance after all transactions"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BACKEND_URL}/admin/users/{user_id}", headers=headers)
        
        if response.status_code == 200:
            data = response.json()["data"]
            wallets = data["wallets"]
            
            usdc_wallet = next((w for w in wallets if w["asset"] == "USDC"), None)
            eur_wallet = next((w for w in wallets if w["asset"] == "EUR"), None)
            
            if usdc_wallet and eur_wallet:
                usdc_balance = Decimal(usdc_wallet["balance"])
                eur_balance = Decimal(eur_wallet["balance"])
                
                # Expected calculations:
                # Initial: USDC=10000, EUR=5000
                # -500 withdrawal, +1000 deposit, +50 deposit, +0 deposit = +550 net
                # -100 EUR withdrawal
                expected_usdc = Decimal("10550.00")  # 10000 - 500 + 1000 + 50 + 0
                expected_eur = Decimal("4900.00")    # 5000 - 100
                
                if usdc_balance == expected_usdc and eur_balance == expected_eur:
                    log_result("Final Balance Verification", True, f"USDC: ${usdc_balance}, EUR: €{eur_balance}")
                    return True
                else:
                    log_result("Final Balance Verification", False, f"Expected USDC: ${expected_usdc}, EUR: €{expected_eur}. Got USDC: ${usdc_balance}, EUR: €{eur_balance}")
                    return False
            else:
                log_result("Final Balance Verification", False, "Wallet not found")
                return False
        else:
            log_result("Final Balance Verification", False, f"Status {response.status_code}")
            return False
    except Exception as e:
        log_result("Final Balance Verification", False, f"Exception: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("=== Zenthos Wallet Backend Testing ===")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Testing admin transaction creation, focusing on withdrawal type bug fix")
    print()
    
    # Step 1: Admin login
    token = admin_login()
    if not token:
        print("❌ Cannot proceed without admin token")
        return
    
    # Step 2: Create test user
    user_id = create_test_user(token)
    if not user_id:
        print("❌ Cannot proceed without test user")
        return
    
    print(f"\n=== Testing Transaction Creation (User: {user_id}) ===")
    
    # Step 3: Test withdrawal transactions (main focus)
    test_withdrawal_transaction_usdc(token, user_id)
    test_withdrawal_transaction_eur(token, user_id)
    
    # Step 4: Test deposit transaction
    test_deposit_transaction_usdc(token, user_id)
    
    # Step 5: Test edge cases (the bug fixes)
    test_empty_fee_field(token, user_id)
    test_empty_amount_field(token, user_id)
    test_invalid_amount(token, user_id)
    test_invalid_asset_type(token, user_id)
    test_invalid_transaction_type(token, user_id)
    
    # Step 6: Test admin stats endpoint
    test_admin_stats(token)
    
    # Step 7: Final balance verification
    test_user_balance_verification(token, user_id)
    
    # Results summary
    print("\n=== Test Results Summary ===")
    print(f"✅ Passed: {test_results['passed']}")
    print(f"❌ Failed: {test_results['failed']}")
    
    if test_results["errors"]:
        print("\n=== Failed Tests Details ===")
        for error in test_results["errors"]:
            print(f"  • {error}")
    
    print(f"\nTotal Tests: {test_results['passed'] + test_results['failed']}")
    
    if test_results["failed"] == 0:
        print("🎉 All tests passed! Admin transaction creation is working correctly.")
    else:
        print("⚠️  Some tests failed. Please check the errors above.")

if __name__ == "__main__":
    main()