"""
URL configuration for cache management endpoints.
"""

from django.urls import path
from . import cache_views

urlpatterns = [
    # Cache statistics and monitoring
    path('stats/', cache_views.CacheStatsView.as_view(), name='cache_stats'),
    path('health/', cache_views.CacheHealthView.as_view(), name='cache_health'),
    path('performance/', cache_views.cache_performance_view, name='cache_performance'),
    
    # Cache management
    path('clear/', cache_views.CacheClearView.as_view(), name='cache_clear_all'),
    path('clear/<str:cache_type>/', cache_views.CacheClearView.as_view(), name='cache_clear_type'),
    path('invalidate/', cache_views.cache_invalidate_pattern_view, name='cache_invalidate_pattern'),
    
    # Debug endpoints (development only)
    path('keys/<str:cache_type>/', cache_views.cache_keys_view, name='cache_keys'),
]
