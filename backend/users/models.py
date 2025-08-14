from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.crypto import get_random_string
import uuid

class CustomUser(AbstractUser):
    USER_ROLES = (
        ('admin', 'Admin'),
        ('user', 'User'),
    )
    
    # Basic fields
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=30, blank=True)
    
    # Role and status
    role = models.CharField(max_length=10, choices=USER_ROLES, default='user')
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # Profile fields
    bio = models.TextField(max_length=500, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    
    # API and premium features
    api_key = models.UUIDField(default=uuid.uuid4, editable=False, null=True, blank=True)
    is_premium = models.BooleanField(default=False)
    premium_expires_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)
    
    # Admin specific fields
    admin_notes = models.TextField(blank=True)
    can_manage_users = models.BooleanField(default=False)
    can_view_analytics = models.BooleanField(default=False)
    
    # Email verification fields
    email_verification_token = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    email_verification_sent_at = models.DateTimeField(null=True, blank=True, db_index=True)
    
    # Password reset fields
    password_reset_token = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    password_reset_sent_at = models.DateTimeField(null=True, blank=True, db_index=True)
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()
    
    @property
    def is_admin(self):
        return self.role == 'admin' or self.is_superuser
    
    def can_access_admin_dashboard(self):
        return self.is_admin or self.can_manage_users or self.can_view_analytics
    
    def generate_email_verification_token(self):
        """Generate a unique token for email verification"""
        token = get_random_string(64)
        self.email_verification_token = token
        self.email_verification_sent_at = timezone.now()
        self.save()
        return token
    
    def generate_password_reset_token(self):
        """Generate a unique token for password reset"""
        token = get_random_string(64)
        self.password_reset_token = token
        self.password_reset_sent_at = timezone.now()
        self.save()
        return token
    
    def verify_email_token(self, token):
        """Verify email verification token"""
        if (self.email_verification_token == token and 
            self.email_verification_sent_at and 
            (timezone.now() - self.email_verification_sent_at).days < 1):
            self.is_verified = True
            self.email_verification_token = None
            self.email_verification_sent_at = None
            self.save()
            return True
        return False
    
    def verify_password_reset_token(self, token):
        """Verify password reset token (valid for 1 hour)"""
        if not self.password_reset_token or not self.password_reset_sent_at:
            return False
        if self.password_reset_token != token:
            return False
        # Use total_seconds for timedelta since 'hours' attr doesn't exist
        age_seconds = (timezone.now() - self.password_reset_sent_at).total_seconds()
        return age_seconds < 3600
    
    def clear_password_reset_token(self):
        """Clear password reset token after use"""
        self.password_reset_token = None
        self.password_reset_sent_at = None
        self.save()
