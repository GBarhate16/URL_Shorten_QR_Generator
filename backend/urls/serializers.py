from rest_framework import serializers
from django.conf import settings
from django.utils.text import slugify
from urllib.parse import urlparse
from .models import ShortenedURL, URLClick, Notification


class ShortenedURLSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username')
    qr_code_url = serializers.SerializerMethodField()
    qr_code_download_url = serializers.SerializerMethodField()
    full_short_url = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = ShortenedURL
        fields = [
            'id', 'original_url', 'short_code', 'title', 'description',
            'user', 'created_at', 'updated_at', 'expires_at', 'is_active',
            'click_count', 'qr_code_url', 'qr_code_download_url', 'full_short_url',
            'is_deleted', 'deleted_at', 'days_remaining'
        ]
        read_only_fields = ['short_code', 'user', 'created_at', 'updated_at', 'click_count', 'qr_code_url', 'qr_code_download_url', 'days_remaining']
    
    def get_qr_code_url(self, obj):
        # Only return Cloudinary URL if present; avoid accessing local file storage
        return getattr(obj, 'qr_code_url', None) or None

    def get_qr_code_download_url(self, obj):
        cloud_name = getattr(settings, 'CLOUDINARY_CLOUD_NAME', None)
        title = (obj.title or obj.short_code or 'qr').strip() or 'qr'
        filename = slugify(title) or f"qr-{obj.short_code}"
        if cloud_name:
            return f"https://res.cloudinary.com/{cloud_name}/image/upload/fl_attachment:{filename}.png/qr_codes/qr_{obj.short_code}.png"
        return None
    
    def get_full_short_url(self, obj):
        frontend_base = getattr(settings, 'FRONTEND_URL', None)
        if frontend_base:
            return f"{frontend_base.rstrip('/')}/r/{obj.short_code}"
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(f'/r/{obj.short_code}')
        return f'{getattr(settings, "FRONTEND_URL", "http://localhost:3000")}/r/{obj.short_code}'

    def get_days_remaining(self, obj):
        """Get days remaining until permanent deletion"""
        if hasattr(obj, 'days_remaining'):
            return obj.days_remaining
        if obj.is_deleted and obj.deleted_at:
            return obj.days_until_permanent_deletion()
        return None


class ShortenedURLCreateSerializer(serializers.ModelSerializer):
    short_code = serializers.CharField(required=False, allow_blank=False, max_length=20)

    class Meta:
        model = ShortenedURL
        fields = ['original_url', 'title', 'expires_at', 'short_code']

    def validate_expires_at(self, value):
        from django.utils import timezone
        if value is None:
            return value
        if value <= timezone.now():
            raise serializers.ValidationError('Expiry must be a future date and time.')
        return value

    def validate_short_code(self, value: str):
        import re
        if not re.match(r'^[A-Za-z0-9-_]+$', value):
            raise serializers.ValidationError('Short code may contain only letters, digits, hyphen and underscore.')
        if ShortenedURL.objects.filter(short_code=value).exists():
            raise serializers.ValidationError('This short code is already taken.')
        return value

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


def parse_user_agent(ua: str):
    ua_lower = (ua or '').lower()
    device = 'desktop'
    if 'mobile' in ua_lower or 'iphone' in ua_lower or 'android' in ua_lower:
        device = 'mobile'
    if 'ipad' in ua_lower or 'tablet' in ua_lower:
        device = 'tablet'
    os = 'unknown'
    if 'windows' in ua_lower:
        os = 'Windows'
    elif 'mac os' in ua_lower or 'macintosh' in ua_lower:
        os = 'macOS'
    elif 'android' in ua_lower:
        os = 'Android'
    elif 'iphone' in ua_lower or 'ipad' in ua_lower or 'ios' in ua_lower:
        os = 'iOS'
    elif 'linux' in ua_lower:
        os = 'Linux'
    browser = 'unknown'
    if 'edg/' in ua_lower or 'edge' in ua_lower:
        browser = 'Edge'
    elif 'chrome' in ua_lower and 'safari' in ua_lower and 'edg' not in ua_lower:
        browser = 'Chrome'
    elif 'safari' in ua_lower and 'chrome' not in ua_lower:
        browser = 'Safari'
    elif 'firefox' in ua_lower:
        browser = 'Firefox'
    return device, os, browser


class URLClickSerializer(serializers.ModelSerializer):
    shortened_url_code = serializers.ReadOnlyField(source='shortened_url.short_code')
    device_type = serializers.SerializerMethodField()
    os = serializers.SerializerMethodField()
    browser = serializers.SerializerMethodField()
    referrer_domain = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()
    
    class Meta:
        model = URLClick
        fields = [
            'id', 'shortened_url', 'shortened_url_code', 'ip_address',
            'user_agent', 'browser', 'os', 'device_type',
            'referrer', 'referrer_domain', 'clicked_at', 'country', 'city', 'location'
        ]
        read_only_fields = ['shortened_url', 'ip_address', 'user_agent', 'referrer', 'clicked_at']

    def get_device_type(self, obj):
        device, _, _ = parse_user_agent(obj.user_agent or '')
        return device

    def get_os(self, obj):
        _, os, _ = parse_user_agent(obj.user_agent or '')
        return os

    def get_browser(self, obj):
        _, _, browser = parse_user_agent(obj.user_agent or '')
        return browser

    def get_referrer_domain(self, obj):
        if not obj.referrer:
            return None
        try:
            return urlparse(obj.referrer).netloc
        except Exception:
            return None

    def get_location(self, obj):
        if obj.country and obj.city:
            return f"{obj.city}, {obj.country}"
        if obj.country:
            return obj.country
        return None


class URLStatsSerializer(serializers.Serializer):
    total_urls = serializers.IntegerField()
    total_clicks = serializers.IntegerField()
    urls_created_today = serializers.IntegerField()
    clicks_today = serializers.IntegerField()
    top_urls = ShortenedURLSerializer(many=True)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'message', 'data',
            'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
