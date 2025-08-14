from django.contrib import admin
from .models import ShortenedURL, URLClick


@admin.register(ShortenedURL)
class ShortenedURLAdmin(admin.ModelAdmin):
    list_display = ['short_code', 'original_url', 'user', 'click_count', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at', 'expires_at', 'user']
    search_fields = ['short_code', 'original_url', 'title', 'user__username']
    readonly_fields = ['short_code', 'created_at', 'updated_at', 'click_count', 'qr_code']
    list_per_page = 20
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('original_url', 'title', 'description', 'user')
        }),
        ('URL Details', {
            'fields': ('short_code', 'is_active', 'expires_at')
        }),
        ('Statistics', {
            'fields': ('click_count', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('QR Code', {
            'fields': ('qr_code',),
            'classes': ('collapse',)
        }),
    )


@admin.register(URLClick)
class URLClickAdmin(admin.ModelAdmin):
    list_display = ['shortened_url', 'ip_address', 'clicked_at', 'country', 'city']
    list_filter = ['clicked_at', 'country', 'city']
    search_fields = ['shortened_url__short_code', 'ip_address', 'user_agent']
    readonly_fields = ['shortened_url', 'ip_address', 'user_agent', 'referrer', 'clicked_at']
    list_per_page = 50
    
    fieldsets = (
        ('Click Information', {
            'fields': ('shortened_url', 'clicked_at')
        }),
        ('Client Details', {
            'fields': ('ip_address', 'user_agent', 'referrer')
        }),
        ('Location', {
            'fields': ('country', 'city'),
            'classes': ('collapse',)
        }),
    )
