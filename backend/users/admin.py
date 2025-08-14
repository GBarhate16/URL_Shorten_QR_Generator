from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Count, Sum
from django.utils import timezone
from datetime import timedelta
from .models import CustomUser

class CustomUserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'full_name', 'role', 'is_active', 'is_verified', 'is_premium', 'date_joined', 'last_login')
    list_filter = ('role', 'is_active', 'is_verified', 'is_premium', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email', 'bio', 'birth_date', 'profile_picture')}),
        ('Role & Permissions', {'fields': ('role', 'is_active', 'is_verified', 'is_premium', 'premium_expires_at')}),
        ('Admin Settings', {'fields': ('admin_notes', 'can_manage_users', 'can_view_analytics')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
        ('Groups', {'fields': ('groups',)}),
        ('User permissions', {'fields': ('user_permissions',)}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'first_name', 'last_name', 'role'),
        }),
    )
    
    readonly_fields = ('date_joined', 'last_login', 'api_key')
    
    def full_name(self, obj):
        return obj.full_name or 'N/A'
    full_name.short_description = 'Full Name'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related()
    
    def has_delete_permission(self, request, obj=None):
        # Prevent superusers from being deleted
        if obj and obj.is_superuser:
            return False
        return super().has_delete_permission(request, obj)
    
    def has_change_permission(self, request, obj=None):
        # Only superusers can change superuser accounts
        if obj and obj.is_superuser and not request.user.is_superuser:
            return False
        return super().has_change_permission(request, obj)

# Register the CustomUser model with the admin
admin.site.register(CustomUser, CustomUserAdmin)

# Customize the default admin site
admin.site.site_header = "🚀 URL Shortener Admin"
admin.site.site_title = "URL Shortener Admin Portal"
admin.site.index_title = "Welcome to URL Shortener Administration"
