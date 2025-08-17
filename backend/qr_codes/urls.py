from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    QRCodeViewSet, QRCodeRedirectView, QRCodeFileUploadView, QRCodeStatsView, QRCodeAnalyticsView
)

# Create router for QR code ViewSet
router = DefaultRouter()
router.register(r'codes', QRCodeViewSet, basename='qr')

urlpatterns = [
    # QR code management endpoints
    path('', include(router.urls)),
    
    # File upload endpoint
    path('upload/', QRCodeFileUploadView.as_view(), name='qr-file-upload'),
    
    # Statistics endpoint
    path('stats/', QRCodeStatsView.as_view(), name='qr-stats'),
    
    # Analytics endpoint
    path('analytics/', QRCodeAnalyticsView.as_view(), name='qr-analytics'),
    
    # Dynamic QR code redirect endpoint (public)
    path('qr/<str:short_code>/', QRCodeRedirectView.as_view(), name='qr-redirect'),
]
