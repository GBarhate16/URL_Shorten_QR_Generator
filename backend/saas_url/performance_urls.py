"""
URL configuration for performance monitoring endpoints.
"""

from django.urls import path
from . import performance_views

urlpatterns = [
    # Performance metrics and monitoring
    path('metrics/', performance_views.PerformanceMetricsView.as_view(), name='performance_metrics'),
    path('endpoints/', performance_views.endpoint_performance_view, name='endpoint_performance'),
    path('health/', performance_views.performance_health_view, name='performance_health'),
    
    # Performance management
    path('clear-metrics/', performance_views.clear_performance_metrics_view, name='clear_performance_metrics'),
]
