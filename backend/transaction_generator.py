"""
Transaction Generator for Blockchain Wallet Platform

This module handles the automatic generation of realistic transaction history
when an admin creates a user account with an initial balance.

The algorithm:
1. Takes total_balance, total_fees, start_date, end_date as input
2. Generates realistic transactions that sum up to total_balance
3. Distributes fees across transactions
4. Creates varied transaction types (deposits, receives, swaps)
5. Spreads transactions across the date range with realistic patterns
"""

import random
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Tuple
import uuid
import hashlib


def generate_fake_tx_hash() -> str:
    """Generate a realistic-looking Ethereum transaction hash"""
    random_bytes = uuid.uuid4().hex + uuid.uuid4().hex
    return "0x" + hashlib.sha256(random_bytes.encode()).hexdigest()[:64]


def generate_fake_eth_address() -> str:
    """Generate a realistic-looking Ethereum address"""
    random_bytes = uuid.uuid4().hex + uuid.uuid4().hex
    return "0x" + hashlib.sha256(random_bytes.encode()).hexdigest()[:40]


def distribute_amount(total: Decimal, num_parts: int, min_amount: Decimal = Decimal("10")) -> List[Decimal]:
    """
    Distribute a total amount into num_parts with realistic variation.
    Returns a list of amounts that sum to total.
    """
    if num_parts <= 0:
        return []
    
    if num_parts == 1:
        return [total]
    
    parts = []
    remaining = total
    
    for i in range(num_parts - 1):
        # Calculate average for remaining parts
        avg = remaining / (num_parts - i)
        
        # Add variation (between 50% and 150% of average)
        variation = Decimal(str(random.uniform(0.5, 1.5)))
        amount = (avg * variation).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        
        # Ensure minimum amount and don't exceed remaining
        amount = max(min_amount, min(amount, remaining - min_amount * (num_parts - i - 1)))
        
        parts.append(amount)
        remaining -= amount
    
    # Last part gets the remainder
    parts.append(remaining.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    
    # Shuffle to avoid pattern of decreasing amounts
    random.shuffle(parts)
    
    return parts


def distribute_dates(start_date: datetime, end_date: datetime, num_transactions: int) -> List[datetime]:
    """
    Distribute transaction dates across a date range with realistic patterns.
    More transactions tend to cluster around certain periods.
    """
    if num_transactions <= 0:
        return []
    
    if num_transactions == 1:
        # Single transaction at a random point in the range
        delta = (end_date - start_date).total_seconds()
        random_seconds = random.uniform(0, delta)
        return [start_date + timedelta(seconds=random_seconds)]
    
    dates = []
    total_seconds = (end_date - start_date).total_seconds()
    
    for _ in range(num_transactions):
        # Random position in the time range
        random_seconds = random.uniform(0, total_seconds)
        tx_date = start_date + timedelta(seconds=random_seconds)
        
        # Add some hour variation (transactions during business hours more likely)
        hour = random.choices(
            range(24),
            weights=[1, 1, 1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 8, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 1]
        )[0]
        minute = random.randint(0, 59)
        second = random.randint(0, 59)
        
        tx_date = tx_date.replace(hour=hour, minute=minute, second=second)
        dates.append(tx_date)
    
    # Sort dates chronologically
    dates.sort()
    
    return dates


def generate_transaction_history(
    user_id: str,
    wallet_id: str,
    total_balance: str,
    total_fees: str,
    start_date: str,
    end_date: str,
    asset: str = "USDC"
) -> List[dict]:
    """
    Generate a realistic transaction history that results in the given total balance.
    
    Args:
        user_id: The user's ID
        wallet_id: The wallet ID
        total_balance: Total balance to achieve (as string decimal)
        total_fees: Total fees to distribute (as string decimal)
        start_date: Start date for transactions (YYYY-MM-DD)
        end_date: End date for transactions (YYYY-MM-DD)
        asset: Asset type (USDC or EUR)
    
    Returns:
        List of transaction dictionaries ready for database insertion
    """
    
    balance = Decimal(total_balance)
    fees = Decimal(total_fees)
    
    # Parse dates
    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
    end_dt = end_dt.replace(hour=23, minute=59, second=59)
    
    # Determine number of transactions based on balance and date range
    days_diff = (end_dt - start_dt).days
    
    # Aim for roughly 1-3 transactions per week on average, capped at 50
    min_transactions = max(3, min(days_diff // 14, 50))
    max_transactions = max(min_transactions, min(days_diff // 3, 50))
    num_transactions = random.randint(min_transactions, max_transactions)
    
    # Distribute the balance across transactions
    amounts = distribute_amount(balance, num_transactions)
    
    # Distribute fees — EVERY transaction gets an unpaid fee (no zero-fee transactions)
    fee_amounts = distribute_amount(fees, num_transactions, min_amount=Decimal("0.50"))
    
    # Shuffle fee distribution across transactions
    random.shuffle(fee_amounts)
    
    # Generate dates
    dates = distribute_dates(start_dt, end_dt, num_transactions)
    
    # Transaction type distribution (weighted)
    tx_types = ["deposit", "receive", "swap"]
    tx_weights = [4, 4, 2]  # Deposits and receives more common
    
    # Counterparty names for receives
    counterparty_names = [
        "Trading Partner", "Investment Fund", "Exchange Transfer",
        "Mining Rewards", "Staking Rewards", "Referral Bonus",
        "Portfolio Transfer", "External Wallet", "DeFi Protocol",
        "Liquidity Pool", "Yield Farm", "Bridge Transfer"
    ]
    
    # Description templates
    descriptions = {
        "deposit": [
            "Deposit from bank account",
            "Wire transfer deposit",
            "Card deposit",
            "Bank transfer",
            "Deposit via SEPA",
            "Fiat deposit"
        ],
        "receive": [
            "Received from external wallet",
            "Transfer received",
            "Incoming transfer",
            "Payment received",
            "Funds received"
        ],
        "swap": [
            "Swap from EUR",
            "Currency exchange",
            "Converted from EUR",
            "Exchange transaction"
        ]
    }
    
    transactions = []
    
    for i in range(num_transactions):
        tx_type = random.choices(tx_types, weights=tx_weights)[0]
        amount = amounts[i]
        fee = fee_amounts[i]
        tx_date = dates[i]
        
        # Generate transaction data
        tx = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "wallet_id": wallet_id,
            "type": tx_type,
            "asset": asset,
            "amount": str(amount),
            "fee": str(fee),
            "fee_paid": False,  # Fees are unpaid initially
            "status": "completed",
            "description": random.choice(descriptions[tx_type]),
            "reference": f"TX{uuid.uuid4().hex[:8].upper()}",
            "tx_hash": generate_fake_tx_hash() if tx_type in ["receive", "swap"] else None,
            "counterparty_address": generate_fake_eth_address() if tx_type == "receive" else None,
            "counterparty_name": random.choice(counterparty_names) if tx_type == "receive" else None,
            "transaction_date": tx_date.isoformat(),
            "created_at": tx_date.isoformat(),
            "created_by_admin": True,
            "admin_id": None  # Will be set when called
        }
        
        transactions.append(tx)
    
    return transactions


def generate_eur_transaction_history(
    user_id: str,
    wallet_id: str,
    total_balance: str,
    start_date: str,
    end_date: str
) -> List[dict]:
    """
    Generate EUR transaction history (simpler, fewer transactions)
    """
    return generate_transaction_history(
        user_id=user_id,
        wallet_id=wallet_id,
        total_balance=total_balance,
        total_fees="0",  # EUR typically no crypto fees
        start_date=start_date,
        end_date=end_date,
        asset="EUR"
    )


def calculate_total_fees(transactions: List[dict]) -> Decimal:
    """Calculate total fees from a list of transactions"""
    return sum(Decimal(tx["fee"]) for tx in transactions)


def calculate_total_balance(transactions: List[dict]) -> Decimal:
    """Calculate total balance from transactions (sum of amounts)"""
    return sum(Decimal(tx["amount"]) for tx in transactions)
