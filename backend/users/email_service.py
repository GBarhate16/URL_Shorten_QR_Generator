from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
import logging
import json
import requests
import threading

logger = logging.getLogger(__name__)

class EmailService:
    """Service class for sending emails"""
    @staticmethod
    def _resolve_resend_from_address() -> str:
        """Use DEFAULT_FROM_EMAIL unless it's a consumer domain; then use onboarding@resend.dev."""
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'onboarding@resend.dev') or 'onboarding@resend.dev'
        lower_from = from_email.lower()
        consumer_domains = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'aol.com'
        ]
        try:
            domain = lower_from.split('@', 1)[1]
        except Exception:
            domain = ''
        if domain in consumer_domains or domain == '' or not lower_from.__contains__('@'):
            return 'onboarding@resend.dev'
        return from_email
    
    @staticmethod
    def send_email_verification(user, verification_url):
        """Send email verification email"""
        subject = "Verify Your Email - SaaS URL"
        html_content = render_to_string('emails/email_verification.html', {
            'user': user,
            'verification_url': verification_url
        })
        text_content = strip_tags(html_content)

        # Prefer Resend API if available
        if getattr(settings, 'RESEND_API_KEY', ''):
            try:
                from_address = EmailService._resolve_resend_from_address()
                response = requests.post(
                    'https://api.resend.com/emails',
                    headers={
                        'Authorization': f'Bearer {settings.RESEND_API_KEY}',
                        'Content-Type': 'application/json',
                    },
                    data=json.dumps({
                        'from': from_address,
                        'to': [user.email],
                        'subject': subject,
                        'html': html_content,
                    })
                )
                if response.status_code in (200, 201):
                    logger.info(f"Email verification sent to {user.email} via Resend API")
                    return True
                else:
                    logger.error(f"Resend API failed for {user.email}: {response.status_code} {response.text}")
            except Exception as api_err:
                logger.error(f"Resend API exception for {user.email}: {str(api_err)}")

        # Fallback to SMTP
        try:
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email]
            )
            email.attach_alternative(html_content, "text/html")
            # Send SMTP in background so request thread is not blocked
            threading.Thread(target=email.send, daemon=True).start()
            logger.info(f"Email verification sent to {user.email} via SMTP")
            return True
        except Exception as smtp_err:
            logger.error(f"SMTP failed for verification to {user.email}: {str(smtp_err)}")
            return False
    
    @staticmethod
    def send_password_reset(user, reset_url):
        """Send password reset email"""
        subject = "Reset Your Password - SaaS URL"
        html_content = render_to_string('emails/password_reset.html', {
            'user': user,
            'reset_url': reset_url
        })
        text_content = strip_tags(html_content)

        # Prefer Resend API if available
        if getattr(settings, 'RESEND_API_KEY', ''):
            try:
                from_address = EmailService._resolve_resend_from_address()
                response = requests.post(
                    'https://api.resend.com/emails',
                    headers={
                        'Authorization': f'Bearer {settings.RESEND_API_KEY}',
                        'Content-Type': 'application/json',
                    },
                    data=json.dumps({
                        'from': from_address,
                        'to': [user.email],
                        'subject': subject,
                        'html': html_content,
                    })
                )
                if response.status_code in (200, 201):
                    logger.info(f"Password reset email sent to {user.email} via Resend API")
                    return True
                else:
                    logger.error(f"Resend API failed for {user.email}: {response.status_code} {response.text}")
            except Exception as api_err:
                logger.error(f"Resend API exception for {user.email}: {str(api_err)}")

        # Fallback to SMTP
        try:
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email]
            )
            email.attach_alternative(html_content, "text/html")
            # Send SMTP in background so request thread is not blocked
            threading.Thread(target=email.send, daemon=True).start()
            logger.info(f"Password reset email sent to {user.email} via SMTP")
            return True
        except Exception as smtp_err:
            logger.error(f"SMTP failed for password reset to {user.email}: {str(smtp_err)}")
            return False
