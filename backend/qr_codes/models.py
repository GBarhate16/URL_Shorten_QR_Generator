from django.db import models
from django.conf import settings
from django.utils import timezone
import qrcode
from io import BytesIO
from django.core.files import File
import random
import string
import json


class QRCode(models.Model):
    """Model for storing QR code information"""
    
    QR_TYPE_CHOICES = [
        ('url', 'URL/Link'),
        ('file', 'File'),
        ('wifi', 'Wi-Fi'),
        ('text', 'Text'),
        ('vcard', 'Contact (vCard)'),
        ('email', 'Email'),
        ('phone', 'Phone'),
        ('sms', 'SMS'),
        ('calendar', 'Calendar Event'),
        ('social', 'Social Media'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('expired', 'Expired'),
    ]
    
    # Basic Information
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='qr_codes')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    qr_type = models.CharField(max_length=20, choices=QR_TYPE_CHOICES)
    
    # Static vs Dynamic
    is_dynamic = models.BooleanField(default=False, help_text="Dynamic QR codes can be updated without regenerating")
    
    # Content Storage
    content = models.JSONField(default=dict, help_text="Stores different data based on QR type")
    
    # QR Code Images
    qr_image = models.ImageField(upload_to='qr_codes/', blank=True, null=True)
    qr_image_url = models.URLField(blank=True, help_text="Cloudinary URL for the QR code image")
    
    # Dynamic QR Code Fields
    short_code = models.CharField(max_length=20, unique=True, blank=True, null=True)
    redirect_url = models.URLField(blank=True, help_text="For dynamic QR codes, points to our redirect endpoint")
    
    # Customization
    customization = models.JSONField(default=dict, help_text="Colors, size, logo, etc.")
    
    # Status and Metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Soft delete fields
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='deleted_qr_codes'
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'QR Code'
        verbose_name_plural = 'QR Codes'
        indexes = [
            models.Index(fields=['user', 'is_deleted', 'deleted_at']),
            models.Index(fields=['is_deleted', 'deleted_at']),
            models.Index(fields=['short_code']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.get_qr_type_display()})"
    
    def soft_delete(self, user=None):
        """Soft delete the QR code - move to trash"""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.deleted_by = user
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])
    
    def restore(self):
        """Restore the QR code from trash"""
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by = None
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])
    
    def hard_delete(self):
        """Permanently delete the QR code"""
        super().delete()
    
    def days_until_permanent_deletion(self):
        """Calculate days remaining until permanent deletion"""
        if not self.is_deleted or not self.deleted_at:
            return None
        
        from datetime import timedelta
        deletion_date = self.deleted_at + timedelta(days=15)
        remaining = deletion_date - timezone.now()
        return max(0, remaining.days)
    
    def is_permanent_deletion_due(self):
        """Check if permanent deletion is due"""
        if not self.is_deleted or not self.deleted_at:
            return False
        
        from datetime import timedelta
        deletion_date = self.deleted_at + timedelta(days=15)
        return timezone.now() >= deletion_date
    
    def save(self, *args, **kwargs):
        # Generate short code for dynamic QR codes
        if self.is_dynamic and not self.short_code:
            self.short_code = self.generate_short_code()
        
        # Generate redirect URL for dynamic QR codes
        if self.is_dynamic and not self.redirect_url:
            self.redirect_url = f"{settings.BACKEND_URL}/qr/{self.short_code}/"
        
        super().save(*args, **kwargs)
    
    def generate_short_code(self):
        """Generate a unique short code for dynamic QR codes"""
        while True:
            code = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
            if not QRCode.objects.filter(short_code=code).exists():
                return code
    
    def is_expired(self):
        """Check if the QR code has expired"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    def get_qr_content(self):
        """Get the content that should be encoded in the QR code"""
        if self.is_dynamic:
            return self.redirect_url
        else:
            return self.generate_static_content()
    
    def generate_static_content(self):
        """Generate static content based on QR type"""
        content = self.content
        
        if self.qr_type == 'url':
            return content.get('url', '')
        
        elif self.qr_type == 'file':
            return content.get('file_url', '')
        
        elif self.qr_type == 'wifi':
            ssid = content.get('ssid', '')
            password = content.get('password', '')
            security = content.get('security', 'WPA')
            hidden = content.get('hidden', False)
            
            # Generate Wi-Fi QR code format
            wifi_string = f"WIFI:S:{ssid};T:{security};P:{password};H:{str(hidden).lower()};;"
            return wifi_string
        
        elif self.qr_type == 'text':
            return content.get('text', '')
        
        elif self.qr_type == 'vcard':
            # Generate vCard format - use correct field names from frontend
            vcard = f"""BEGIN:VCARD
VERSION:3.0
FN:{content.get('name', '')}
ORG:{content.get('company', '')}
TEL:{content.get('phone', '')}
EMAIL:{content.get('email', '')}
TITLE:{content.get('title', '')}
ADR:;;{content.get('address', '')}
END:VCARD"""
            return vcard
        
        elif self.qr_type == 'email':
            email = content.get('email', '')
            subject = content.get('subject', '')
            body = content.get('body', '')
            return f"mailto:{email}?subject={subject}&body={body}"
        
        elif self.qr_type == 'phone':
            phone = content.get('phone', '')
            return f"tel:{phone}"
        
        elif self.qr_type == 'sms':
            phone = content.get('phone', '')
            message = content.get('message', '')
            return f"sms:{phone}?body={message}"
        
        elif self.qr_type == 'event':
            # Generate iCal format for events
            title = content.get('title', '')
            startTime = content.get('startTime', '')
            endTime = content.get('endTime', '')
            location = content.get('location', '')
            description = content.get('description', '')
            
            ical = f"""BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:{title}
DTSTART:{startTime}
DTEND:{endTime}
LOCATION:{location}
DESCRIPTION:{description}
END:VEVENT
END:VCALENDAR"""
            return ical
        
        elif self.qr_type == 'calendar':
            # Generate iCal format
            summary = content.get('summary', '')
            start_date = content.get('start_date', '')
            end_date = content.get('end_date', '')
            location = content.get('location', '')
            description = content.get('description', '')
            
            ical = f"""BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:{summary}
DTSTART:{start_date}
DTEND:{end_date}
LOCATION:{location}
DESCRIPTION:{description}
END:VEVENT
END:VCALENDAR"""
            return ical
        
        elif self.qr_type == 'social':
            platform = content.get('platform', '')
            username = content.get('username', '')
            
            if platform == 'instagram':
                return f"https://instagram.com/{username}"
            elif platform == 'twitter':
                return f"https://twitter.com/{username}"
            elif platform == 'facebook':
                return f"https://facebook.com/{username}"
            elif platform == 'linkedin':
                return f"https://linkedin.com/in/{username}"
            else:
                return content.get('url', '')
        
        return ''


class QRCodeScan(models.Model):
    """Model for tracking QR code scans (for dynamic QR codes)"""
    
    qr_code = models.ForeignKey(QRCode, on_delete=models.CASCADE, related_name='scans')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    referrer = models.URLField(blank=True)
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    device_type = models.CharField(max_length=50, blank=True)
    browser = models.CharField(max_length=50, blank=True)
    os = models.CharField(max_length=50, blank=True)
    scanned_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-scanned_at']
    
    def __str__(self):
        return f"Scan of {self.qr_code.title} at {self.scanned_at}"


class QRCodeFile(models.Model):
    """Model for storing files uploaded for QR codes"""
    
    qr_code = models.ForeignKey(QRCode, on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to='qr_files/')
    file_url = models.URLField(blank=True, help_text="Cloudinary URL")
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField(help_text="File size in bytes")
    file_type = models.CharField(max_length=100)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.file_name} for {self.qr_code.title}"
