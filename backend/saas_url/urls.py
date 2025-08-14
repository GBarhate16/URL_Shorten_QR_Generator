"""
URL configuration for saas_url project.
"""
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse
from django.conf import settings
from django.conf.urls.static import static

def root_ok(request):
    return HttpResponse("OK", content_type="text/plain")

urlpatterns = [
    path('', root_ok),
    path('health/', root_ok),
    path('admin/', admin.site.urls),
    path('api/', include('urls.urls')),
    path('api/users/', include('users.urls')),
]

# Serve static and media files during development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
