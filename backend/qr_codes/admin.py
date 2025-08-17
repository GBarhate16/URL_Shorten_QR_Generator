from django.contrib import admin
from .models import QRCode, QRCodeScan, QRCodeFile


@admin.register(QRCode)
class QRCodeAdmin(admin.ModelAdmin):
    """Admin interface for QR codes"""
    
    list_display = [
        'title', 'user', 'qr_type', 'is_dynamic', 'status', 
        'created_at', 'scan_count'
    ]
    list_filter = [
        'qr_type', 'is_dynamic', 'status', 'created_at', 'user'
    ]
    search_fields = ['title', 'description', 'user__username', 'user__email']
    readonly_fields = [
        'short_code', 'redirect_url', 'qr_image_url', 'created_at', 'updated_at'
    ]
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'title', 'description', 'qr_type', 'is_dynamic')
        }),
        ('Content', {
            'fields': ('content',)
        }),
        ('Dynamic QR Code', {
            'fields': ('short_code', 'redirect_url'),
            'classes': ('collapse',)
        }),
        ('Customization', {
            'fields': ('customization',),
            'classes': ('collapse',)
        }),
        ('Status & Metadata', {
            'fields': ('status', 'expires_at', 'created_at', 'updated_at')
        }),
        ('QR Code Image', {
            'fields': ('qr_image', 'qr_image_url'),
            'classes': ('collapse',)
        }),
    )
    
    def scan_count(self, obj):
        """Display scan count for dynamic QR codes"""
        if obj.is_dynamic:
            return obj.scans.count()
        return 'N/A (Static)'
    scan_count.short_description = 'Scan Count'
    
    def get_queryset(self, request):
        """Optimize queryset with related fields"""
        return super().get_queryset(request).select_related('user').prefetch_related('scans')


@admin.register(QRCodeScan)
class QRCodeScanAdmin(admin.ModelAdmin):
    """Admin interface for QR code scans"""
    
    list_display = [
        'qr_code', 'ip_address', 'country', 'device_type', 'browser', 'scanned_at'
    ]
    list_filter = [
        'device_type', 'browser', 'os', 'scanned_at', 'qr_code__qr_type'
    ]
    search_fields = [
        'qr_code__title', 'ip_address', 'user_agent', 'country', 'city'
    ]
    readonly_fields = ['scanned_at']
    date_hierarchy = 'scanned_at'
    
    def get_queryset(self, request):
        """Optimize queryset with related fields"""
        return super().get_queryset(request).select_related('qr_code', 'qr_code__user')


@admin.register(QRCodeFile)
class QRCodeFileAdmin(admin.ModelAdmin):
    """Admin interface for QR code files"""
    
    list_display = [
        'file_name', 'qr_code', 'file_type', 'file_size', 'uploaded_at'
    ]
    list_filter = ['file_type', 'uploaded_at']
    search_fields = ['file_name', 'qr_code__title']
    readonly_fields = ['uploaded_at']
    date_hierarchy = 'uploaded_at'
    
    def get_queryset(self, request):
        """Optimize queryset with related fields"""
        return super().get_queryset(request).select_related('qr_code', 'qr_code__user')
