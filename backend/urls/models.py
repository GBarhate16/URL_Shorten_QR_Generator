from django.db import models
from django.conf import settings
from django.utils import timezone
import qrcode
from io import BytesIO
from django.core.files import File
from PIL import Image
import os


class ShortenedURL(models.Model):
    original_url = models.URLField(max_length=2048)
    short_code = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='shortened_urls')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    click_count = models.IntegerField(default=0)
    qr_code = models.ImageField(upload_to='qr_codes/', blank=True, null=True)
    qr_code_url = models.URLField(max_length=2048, blank=True)  # Cloudinary URL
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Shortened URL'
        verbose_name_plural = 'Shortened URLs'
    
    def __str__(self):
        return f"{self.short_code} -> {self.original_url[:50]}..."
    
    def save(self, *args, **kwargs):
        if not self.short_code:
            self.short_code = self.generate_short_code()
        
        # Generate QR code if not exists
        if not self.qr_code:
            self.generate_qr_code()
        
        super().save(*args, **kwargs)
    
    def generate_short_code(self):
        """Generate a unique short code for the URL"""
        import random
        import string
        
        while True:
            # Generate 8 character random string
            code = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
            if not ShortenedURL.objects.filter(short_code=code).exists():
                return code
    
    def generate_qr_code(self):
        """Generate QR code for the shortened URL and upload to Cloudinary"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        
        # Create the frontend-facing short URL for QR code
        frontend_base = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
        full_url = f"{frontend_base}/r/{self.short_code}"
        
        qr.add_data(full_url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Save to BytesIO
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        # Save to model file storage (optional local copy)
        filename = f'qr_code_{self.short_code}.png'
        self.qr_code.save(filename, File(buffer), save=False)
        
        # Upload to Cloudinary
        try:
            import cloudinary
            import cloudinary.uploader
            cloudinary.config(
                cloud_name=getattr(settings, 'CLOUDINARY_CLOUD_NAME', None),
                api_key=getattr(settings, 'CLOUDINARY_API_KEY', None),
                api_secret=getattr(settings, 'CLOUDINARY_API_SECRET', None),
                secure=True,
            )
            buffer.seek(0)
            upload_result = cloudinary.uploader.upload(
                buffer,
                folder='qr_codes',
                public_id=f'qr_{self.short_code}',
                overwrite=True,
                resource_type='image',
                format='png',
            )
            self.qr_code_url = upload_result.get('secure_url') or upload_result.get('url') or ''
        except Exception as e:
            # Fallback: leave qr_code_url blank if upload fails
            self.qr_code_url = self.qr_code.url if self.qr_code else ''
    
    def is_expired(self):
        """Check if the URL has expired"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    def increment_click_count(self):
        """Increment the click count"""
        self.click_count += 1
        self.save(update_fields=['click_count'])


class URLClick(models.Model):
    shortened_url = models.ForeignKey(ShortenedURL, on_delete=models.CASCADE, related_name='clicks')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    referrer = models.URLField(blank=True)
    clicked_at = models.DateTimeField(auto_now_add=True, db_index=True)
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('url_created', 'URL Created'),
        ('url_clicked', 'URL Clicked'),
        ('url_expired', 'URL Expired'),
        ('system', 'System'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True)  # Additional data like URL ID, click count, etc.
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.title}"
    
    @classmethod
    def create_notification(cls, user, notification_type, title, message, data=None):
        """Create a notification and send real-time update"""
        notification = cls.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            data=data or {}
        )
        
        # Send real-time notification via WebSocket
        from .consumers import send_notification_to_user
        send_notification_to_user(user.id, {
            'type': 'notification',
            'notification': {
                'id': notification.id,
                'type': notification.notification_type,
                'title': notification.title,
                'message': notification.message,
                'data': notification.data,
                'created_at': notification.created_at.isoformat(),
                'is_read': notification.is_read
            }
        })
        
        return notification
