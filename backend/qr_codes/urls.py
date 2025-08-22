from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for QR code ViewSet
router = DefaultRouter()
router.register(r'codes', views.QRCodeViewSet, basename='qrcode')

urlpatterns = [
    # QR code management endpoints
    path('', include(router.urls)),
    
    # Analytics and stats endpoints
    path('analytics/', views.QRCodeAnalyticsView.as_view(), name='qr-analytics'),
    path('stats/', views.QRCodeStatsView.as_view(), name='qr-stats'),
    
    # Dynamic QR code redirect endpoint (public)
    path('qr/<str:short_code>/', views.QRCodeRedirectView.as_view(), name='qr-redirect'),
    path('trash/', views.QRCodeViewSet.as_view({'get': 'trash'}), name='qr-trash'),
]
