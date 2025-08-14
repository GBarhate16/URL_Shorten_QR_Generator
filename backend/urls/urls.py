from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'urls', views.ShortenedURLViewSet, basename='shortened-url')
router.register(r'notifications', views.NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
    path('redirect/<str:short_code>/', views.URLRedirectView.as_view(), name='url-redirect'),
    # Compat path to match frontend expectation (/api/urls/redirect/<code>/)
    path('urls/redirect/<str:short_code>/', views.URLRedirectView.as_view(), name='url-redirect-compat'),
    path('public/', views.PublicURLView.as_view(), name='public-url'),
]
