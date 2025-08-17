"""
Performance Optimization Middleware

This middleware implements various performance optimizations:
- GZIP compression
- Cache headers
- Response optimization
- Database query monitoring
- Performance metrics
"""

import gzip
import json
import time
import logging
from typing import Any, Dict, Optional
from django.http import HttpRequest, HttpResponse
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from django.core.cache import cache
from django.db import connection
from django.utils.cache import patch_cache_control

logger = logging.getLogger(__name__)


class PerformanceMiddleware(MiddlewareMixin):
    """
    Middleware for performance optimization and monitoring.
    """
    
    def __init__(self, get_response=None):
        super().__init__(get_response)
        self.get_response = get_response
        
        # Performance settings
        self.enable_gzip = getattr(settings, 'ENABLE_GZIP', True)
        self.enable_cache_headers = getattr(settings, 'ENABLE_CACHE_HEADERS', True)
        self.enable_query_monitoring = getattr(settings, 'ENABLE_QUERY_MONITORING', True)
        self.min_response_size_for_gzip = getattr(settings, 'MIN_RESPONSE_SIZE_FOR_GZIP', 500)
        
        # Cache duration settings (in seconds)
        self.cache_durations = getattr(settings, 'CACHE_DURATIONS', {
            'static': 31536000,  # 1 year
            'api': 300,          # 5 minutes
            'html': 600,         # 10 minutes
            'json': 300,         # 5 minutes
        })
    
    def process_request(self, request: HttpRequest) -> Optional[HttpResponse]:
        """Process incoming request for performance monitoring."""
        # Start timing
        request._start_time = time.time()
        
        # Reset query count for this request
        if self.enable_query_monitoring:
            try:
                # Check if queries logging is properly configured
                if hasattr(connection, 'queries') and isinstance(connection.queries, list):
                    request._initial_query_count = len(connection.queries)
                else:
                    request._initial_query_count = 0
            except Exception as e:
                logger.warning(f"Could not initialize query monitoring: {e}")
                request._initial_query_count = 0
        
        return None
    
    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        """Process outgoing response for performance optimization."""
        # Calculate request time
        if hasattr(request, '_start_time'):
            request_time = time.time() - request._start_time
            response['X-Request-Time'] = f"{request_time:.4f}s"
        
        # Add cache headers
        if self.enable_cache_headers:
            response = self._add_cache_headers(request, response)
        
        # Add performance headers
        response = self._add_performance_headers(request, response)
        
        # GZIP compression
        if self.enable_gzip and self._should_compress(request, response):
            response = self._compress_response(response)
        
        # Log performance metrics
        self._log_performance_metrics(request, response)
        
        return response
    
    def _add_cache_headers(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        """Add appropriate cache headers based on content type and path."""
        content_type = response.get('Content-Type', '')
        path = request.path
        
        # Determine cache duration
        cache_duration = self._get_cache_duration(path, content_type)
        
        if cache_duration > 0:
            # Add cache control headers
            patch_cache_control(response, 
                              public=True, 
                              max_age=cache_duration,
                              s_maxage=cache_duration)
            
            # Add ETag for caching
            if not response.get('ETag'):
                response['ETag'] = f'W/"{"-".join([str(response.status_code), str(len(response.content))])}"'
        
        return response
    
    def _get_cache_duration(self, path: str, content_type: str) -> int:
        """Get appropriate cache duration for the response."""
        # Static files
        if path.startswith('/static/') or path.startswith('/media/'):
            return self.cache_durations['static']
        
        # API responses
        if path.startswith('/api/'):
            if 'application/json' in content_type:
                return self.cache_durations['api']
        
        # HTML responses
        if 'text/html' in content_type:
            return self.cache_durations['html']
        
        # Default
        return 0
    
    def _add_performance_headers(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        """Add performance-related headers."""
        # Add security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        
        # Add performance headers
        response['X-Powered-By'] = 'Django Performance Optimized'
        
        # Add query count header (if monitoring enabled)
        if self.enable_query_monitoring and hasattr(request, '_initial_query_count'):
            try:
                # Check if queries logging is properly configured
                if hasattr(connection, 'queries') and isinstance(connection.queries, list):
                    query_count = len(connection.queries) - request._initial_query_count
                else:
                    query_count = 0
                response['X-Query-Count'] = str(query_count)
            except Exception as e:
                logger.warning(f"Could not get query count: {e}")
                response['X-Query-Count'] = '0'
        
        return response
    
    def _should_compress(self, request: HttpRequest, response: HttpResponse) -> bool:
        """Determine if response should be compressed."""
        # Check if client accepts gzip
        accept_encoding = request.META.get('HTTP_ACCEPT_ENCODING', '')
        if 'gzip' not in accept_encoding:
            return False
        
        # Check content type
        content_type = response.get('Content-Type', '')
        compressible_types = [
            'text/', 'application/json', 'application/xml', 
            'application/javascript', 'application/css'
        ]
        
        if not any(ct in content_type for ct in compressible_types):
            return False
        
        # Check response size
        if len(response.content) < self.min_response_size_for_gzip:
            return False
        
        return True
    
    def _compress_response(self, response: HttpResponse) -> HttpResponse:
        """Compress response content using GZIP."""
        try:
            # Compress content
            compressed_content = gzip.compress(response.content)
            
            # Update response
            response.content = compressed_content
            response['Content-Encoding'] = 'gzip'
            response['Content-Length'] = str(len(compressed_content))
            
            # Add Vary header
            if 'Vary' in response:
                if 'Accept-Encoding' not in response['Vary']:
                    response['Vary'] = f"{response['Vary']}, Accept-Encoding"
            else:
                response['Vary'] = 'Accept-Encoding'
            
        except Exception as e:
            logger.error(f"GZIP compression failed: {e}")
        
        return response
    
    def _log_performance_metrics(self, request: HttpRequest, response: HttpResponse) -> None:
        """Log performance metrics for monitoring."""
        try:
            # Calculate metrics
            request_time = float(response.get('X-Request-Time', '0s').rstrip('s'))
            query_count = int(response.get('X-Query-Count', '0'))
            response_size = len(response.content)
            
            # Log slow requests
            if request_time > 1.0:  # Log requests taking more than 1 second
                logger.warning(
                    f"Slow request: {request.path} took {request_time:.2f}s, "
                    f"queries: {query_count}, size: {response_size} bytes"
                )
            
            # Log high query count requests
            if query_count > 10:  # Log requests with more than 10 queries
                logger.warning(
                    f"High query count: {request.path} executed {query_count} queries "
                    f"in {request_time:.2f}s"
                )
            
            # Store metrics in cache for monitoring
            self._store_performance_metrics(request.path, request_time, query_count, response_size)
            
        except Exception as e:
            logger.error(f"Error logging performance metrics: {e}")
    
    def _store_performance_metrics(self, path: str, request_time: float, 
                                 query_count: int, response_size: int) -> None:
        """Store performance metrics in cache for monitoring."""
        try:
            # Create metrics key
            metrics_key = f"perf_metrics:{path}"
            
            # Get existing metrics
            existing_metrics = cache.get(metrics_key, {
                'count': 0,
                'total_time': 0.0,
                'total_queries': 0,
                'total_size': 0,
                'max_time': 0.0,
                'max_queries': 0,
                'max_size': 0,
            })
            
            # Update metrics
            existing_metrics['count'] += 1
            existing_metrics['total_time'] += request_time
            existing_metrics['total_queries'] += query_count
            existing_metrics['total_size'] += response_size
            existing_metrics['max_time'] = max(existing_metrics['max_time'], request_time)
            existing_metrics['max_queries'] = max(existing_metrics['max_queries'], query_count)
            existing_metrics['max_size'] = max(existing_metrics['max_size'], response_size)
            
            # Calculate averages
            existing_metrics['avg_time'] = existing_metrics['total_time'] / existing_metrics['count']
            existing_metrics['avg_queries'] = existing_metrics['total_queries'] / existing_metrics['count']
            existing_metrics['avg_size'] = existing_metrics['total_size'] / existing_metrics['count']
            
            # Store in cache for 1 hour
            cache.set(metrics_key, existing_metrics, 3600)
            
        except Exception as e:
            logger.error(f"Error storing performance metrics: {e}")


class DatabaseOptimizationMiddleware(MiddlewareMixin):
    """
    Middleware for database query optimization and monitoring.
    """
    
    def __init__(self, get_response=None):
        super().__init__(get_response)
        self.get_response = get_response
        self.enable_query_optimization = getattr(settings, 'ENABLE_QUERY_OPTIMIZATION', True)
    
    def process_request(self, request: HttpRequest) -> Optional[HttpResponse]:
        """Process request for database optimization."""
        if self.enable_query_optimization:
            # Enable query logging for debugging
            if settings.DEBUG:
                try:
                    connection.queries_log = True
                except Exception as e:
                    logger.warning(f"Could not enable query logging: {e}")
            
            # Reset query count
            request._db_start_time = time.time()
        
        return None
    
    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        """Process response for database optimization."""
        if self.enable_query_optimization and hasattr(request, '_db_start_time'):
            # Calculate database time
            db_time = time.time() - request._db_start_time
            response['X-Database-Time'] = f"{db_time:.4f}s"
            
            # Log slow database operations
            if db_time > 0.5:  # Log operations taking more than 0.5 seconds
                logger.warning(
                    f"Slow database operation: {request.path} took {db_time:.2f}s"
                )
        
        return response


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Middleware for adding security and performance headers.
    """
    
    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        """Add security and performance headers."""
        # Security headers
        response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        # Performance headers
        response['X-DNS-Prefetch-Control'] = 'on'
        
        return response
