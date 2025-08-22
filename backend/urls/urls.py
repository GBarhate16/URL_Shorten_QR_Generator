from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'urls', views.ShortenedURLViewSet, basename='url')
router.register(r'notifications', views.NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
    path('redirect/<str:short_code>/', views.URLRedirectView.as_view(), name='url-redirect'),
    path('trash/', views.CombinedTrashView.as_view(), name='combined-trash'),
]
