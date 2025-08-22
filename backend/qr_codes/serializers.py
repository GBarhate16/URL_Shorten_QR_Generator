import logging
from rest_framework import serializers
from .models import QRCode, QRCodeScan, QRCodeFile
from django.utils import timezone

logger = logging.getLogger(__name__)


class QRCodeFileSerializer(serializers.ModelSerializer):
    """Serializer for QR code files"""
    
    class Meta:
        model = QRCodeFile
        fields = ['id', 'file', 'file_url', 'file_name', 'file_size', 'file_type', 'uploaded_at']
        read_only_fields = ['file_url', 'file_size', 'file_type', 'uploaded_at']


class QRCodeScanSerializer(serializers.ModelSerializer):
    """Serializer for QR code scans"""
    
    class Meta:
        model = QRCodeScan
        fields = ['id', 'ip_address', 'user_agent', 'country', 'city', 'device_type', 'browser', 'os', 'scanned_at']
        read_only_fields = ['ip_address', 'user_agent', 'country', 'city', 'device_type', 'browser', 'os', 'scanned_at']


class QRCodeSerializer(serializers.ModelSerializer):
    """Main serializer for QR codes"""
    
    files = QRCodeFileSerializer(many=True, read_only=True)
    scans = QRCodeScanSerializer(many=True, read_only=True)
    scan_count = serializers.SerializerMethodField()
    qr_type_display = serializers.CharField(source='get_qr_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    days_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = QRCode
        fields = [
            'id', 'title', 'description', 'qr_type', 'qr_type_display',
            'is_dynamic', 'content', 'qr_image', 'qr_image_url',
            'short_code', 'redirect_url', 'customization',
            'status', 'status_display', 'expires_at', 'created_at', 'updated_at',
            'files', 'scans', 'scan_count', 'is_deleted', 'deleted_at', 'days_remaining'
        ]
        read_only_fields = ['qr_image', 'qr_image_url', 'short_code', 'redirect_url', 'created_at', 'updated_at', 'days_remaining']
    
    def get_scan_count(self, obj):
        """Get the number of scans for this QR code"""
        return obj.scans.count()
    
    def get_days_remaining(self, obj):
        """Get days remaining until permanent deletion"""
        if hasattr(obj, 'days_remaining'):
            return obj.days_remaining
        if obj.is_deleted and obj.deleted_at:
            return obj.days_until_permanent_deletion()
        return None


class QRCodeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating QR codes"""
    
    class Meta:
        model = QRCode
        fields = [
            'title', 'description', 'qr_type', 'is_dynamic', 'content',
            'customization', 'expires_at'
        ]
    
    def validate_content(self, value):
        """Validate content based on QR type"""
        qr_type = self.initial_data.get('qr_type')
        logger.info(f"Validating content for QR type: {qr_type}")
        logger.info(f"Content value: {value}")
        
        if qr_type == 'url':
            if 'url' not in value or not value['url']:
                logger.error("URL is required for URL type QR codes")
                raise serializers.ValidationError("URL is required for URL type QR codes")
        
        elif qr_type == 'wifi':
            if 'wifi' not in value or not value['wifi'] or not value['wifi'].get('ssid'):
                logger.error("WiFi SSID is required for Wi-Fi QR codes")
                raise serializers.ValidationError("WiFi SSID is required for Wi-Fi QR codes")
        
        elif qr_type == 'text':
            if 'text' not in value or not value['text']:
                logger.error("Text content is required for text QR codes")
                raise serializers.ValidationError("Text content is required for text QR codes")
        
        elif qr_type == 'vcard':
            if 'vcard' not in value or not value['vcard'] or not value['vcard'].get('name'):
                logger.error("Contact name is required for vCard QR codes")
                raise serializers.ValidationError("Contact name is required for vCard QR codes")
        
        elif qr_type == 'event':
            if 'event' not in value or not value['event'] or not value['event'].get('title'):
                logger.error("Event title is required for event QR codes")
                raise serializers.ValidationError("Event title is required for event QR codes")
        
        elif qr_type == 'file':
            if 'file' not in value or not value['file'] or not value['file'].get('url'):
                logger.error("File URL is required for file QR codes")
                raise serializers.ValidationError("File URL is required for file QR codes")
        
        logger.info("Content validation passed")
        return value
    
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
    
    def validate_expires_at(self, value):
        """Handle empty string for expires_at and validate future date"""
        if value == '':
            return None
        if value and value <= timezone.now():
            raise serializers.ValidationError("Expiration date must be in the future")
        return value


class QRCodeUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating QR codes (mainly for dynamic QR codes)"""
    
    class Meta:
        model = QRCode
        fields = ['title', 'description', 'content', 'customization', 'status', 'expires_at']
    
    def validate_content(self, value):
        """Validate content based on QR type"""
        # Get the existing QR code instance
        instance = self.instance
        if not instance:
            return value
        
        qr_type = instance.qr_type
        
        if qr_type == 'url':
            if 'url' not in value or not value['url']:
                raise serializers.ValidationError("URL is required for URL type QR codes")
        
        elif qr_type == 'wifi':
            required_fields = ['ssid']
            for field in required_fields:
                if field not in value or not value[field]:
                    raise serializers.ValidationError(f"{field.title()} is required for Wi-Fi QR codes")
        
        elif qr_type == 'text':
            if 'text' not in value or not value['text']:
                raise serializers.ValidationError("Text content is required for text QR codes")
        
        elif qr_type == 'vcard':
            if 'full_name' not in value or not value['full_name']:
                raise serializers.ValidationError("Full name is required for vCard QR codes")
        
        elif qr_type == 'email':
            if 'email' not in value or not value['email']:
                raise serializers.ValidationError("Email is required for email QR codes")
        
        elif qr_type == 'phone':
            if 'phone' not in value or not value['phone']:
                raise serializers.ValidationError("Phone number is required for phone QR codes")
        
        elif qr_type == 'sms':
            if 'phone' not in value or not value['phone']:
                raise serializers.ValidationError("Phone number is required for SMS QR codes")
        
        elif qr_type == 'calendar':
            required_fields = ['summary', 'start_date']
            for field in required_fields:
                if field not in value or not value[field]:
                    raise serializers.ValidationError(f"{field.title()} is required for calendar QR codes")
        
        elif qr_type == 'social':
            if 'platform' not in value or not value['platform']:
                raise serializers.ValidationError("Platform is required for social media QR codes")
            if 'username' not in value or not value['username']:
                raise serializers.ValidationError("Username is required for social media QR codes")
        
        return value


class QRCodeAnalyticsSerializer(serializers.Serializer):
    """Serializer for QR code analytics"""
    
    total_scans = serializers.IntegerField()
    recent_scans = QRCodeScanSerializer(many=True)
    scans_by_date = serializers.DictField()
    scans_by_country = serializers.DictField()
    scans_by_device = serializers.DictField()
    scans_by_browser = serializers.DictField()


class QRCodeCustomizationSerializer(serializers.Serializer):
    """Serializer for QR code customization options"""
    
    # Colors
    foreground_color = serializers.CharField(max_length=7, default="#000000")
    background_color = serializers.CharField(max_length=7, default="#FFFFFF")
    
    # Size
    size = serializers.ChoiceField(choices=[('small', 'Small'), ('medium', 'Medium'), ('large', 'Large')], default='medium')
    
    # Logo
    logo_url = serializers.URLField(required=False, allow_blank=True)
    logo_size = serializers.FloatField(min_value=0.1, max_value=0.5, default=0.2)
    
    # Style
    corner_style = serializers.ChoiceField(choices=[('square', 'Square'), ('rounded', 'Rounded'), ('dot', 'Dot')], default='square')
    error_correction = serializers.ChoiceField(choices=[('L', 'Low'), ('M', 'Medium'), ('Q', 'High'), ('H', 'Highest')], default='M')
    
    # Border
    border_width = serializers.IntegerField(min_value=0, max_value=10, default=4)
    border_color = serializers.CharField(max_length=7, default="#000000")
