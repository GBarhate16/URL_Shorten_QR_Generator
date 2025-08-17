"""
Cache Middleware for Django

This middleware automatically caches responses for certain endpoints
to improve performance without requiring manual cache decorators.

Features:
- Automatic response caching for GET requests
- Configurable cache rules per URL pattern
- Cache invalidation on POST/PUT/DELETE requests
- Memory-efficient caching with TTL
"""

import re
import hashlib
import json
import logging
from typing import Dict, List, Optional, Any
from django.http import HttpRequest, HttpResponse
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from .cache import get_cache, cache_manager

logger = logging.getLogger(__name__)


class CacheMiddleware(MiddlewareMixin):
    """
    Middleware for automatic response caching.
    
    This middleware intercepts requests and responses to automatically
    cache GET responses and invalidate caches on mutations.
    """
    
    def __init__(self, get_response=None):
        super().__init__(get_response)
        self.get_response = get_response
        
        # Cache rules configuration
        self.cache_rules = getattr(settings, 'CACHE_RULES', {
            # URL patterns that should be cached
            r'^/api/urls/$': {
                'cache_type': 'url',
                'ttl': 300,  # 5 minutes
                'vary_by_user': True,
                'vary_by_method': False,
            },
            r'^/api/urls/stats/$': {
                'cache_type': 'analytics',
                'ttl': 900,  # 15 minutes
                'vary_by_user': True,
                'vary_by_method': False,
            },
            r'^/api/urls/analytics/$': {
                'cache_type': 'analytics',
                'ttl': 900,  # 15 minutes
                'vary_by_user': True,
                'vary_by_method': False,
            },
            r'^/api/users/profile/$': {
                'cache_type': 'user',
                'ttl': 1800,  # 30 minutes
                'vary_by_user': True,
                'vary_by_method': False,
            },
            r'^/api/urls/redirect/(?P<short_code>[^/]+)/$': {
                'cache_type': 'url',
                'ttl': 3600,  # 1 hour
                'vary_by_user': False,
                'vary_by_method': False,
            },
        })
        
        # Compile regex patterns for performance
        self.compiled_rules = {
            re.compile(pattern): config 
            for pattern, config in self.cache_rules.items()
        }
    
    def process_request(self, request: HttpRequest) -> Optional[HttpResponse]:
        """
        Process incoming request to check for cached responses.
        """
        # Only cache GET requests
        if request.method != 'GET':
            return None
        
        # Check if this URL matches any cache rules
        cache_config = self._get_cache_config(request.path)
        if not cache_config:
            return None
        
        # Generate cache key
        cache_key = self._generate_cache_key(request, cache_config)
        if not cache_key:
            return None
        
        # Try to get from cache
        cache = get_cache(cache_config['cache_type'])
        cached_response = cache.get(cache_key)
        
        if cached_response is not None:
            logger.debug(f"Cache HIT for {request.path}: {cache_key}")
            return cached_response
        
        logger.debug(f"Cache MISS for {request.path}: {cache_key}")
        
        # Store cache info for response processing
        request._cache_config = cache_config
        request._cache_key = cache_key
        
        return None
    
    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        """
        Process outgoing response to cache successful responses.
        """
        # Check if we should cache this response
        if not hasattr(request, '_cache_config') or not hasattr(request, '_cache_key'):
            return response
        
        # Only cache successful responses
        if response.status_code != 200:
            return response
        
        # Cache the response
        try:
            cache_config = request._cache_config
            cache_key = request._cache_key
            
            cache = get_cache(cache_config['cache_type'])
            cache.set(cache_key, response, ttl=cache_config['ttl'])
            
            logger.debug(f"Cached response for {request.path}: {cache_key}")
            
        except Exception as e:
            logger.error(f"Error caching response: {e}")
        
        # Clean up
        if hasattr(request, '_cache_config'):
            delattr(request, '_cache_config')
        if hasattr(request, '_cache_key'):
            delattr(request, '_cache_key')
        
        return response
    
    def _get_cache_config(self, path: str) -> Optional[Dict[str, Any]]:
        """
        Get cache configuration for a given URL path.
        """
        for pattern, config in self.compiled_rules.items():
            if pattern.match(path):
                return config
        return None
    
    def _generate_cache_key(self, request: HttpRequest, config: Dict[str, Any]) -> Optional[str]:
        """
        Generate a cache key for the request.
        """
        try:
            key_parts = [request.path]
            
            # Add query parameters
            if request.GET:
                key_parts.append(str(sorted(request.GET.items())))
            
            # Add user ID if varying by user
            if config.get('vary_by_user') and hasattr(request, 'user') and request.user.is_authenticated:
                key_parts.append(f"user_{request.user.id}")
            
            # Add method if varying by method
            if config.get('vary_by_method'):
                key_parts.append(request.method)
            
            # Create hash of key parts
            key_data = ':'.join(key_parts)
            key_hash = hashlib.md5(key_data.encode('utf-8')).hexdigest()
            
            return f"middleware:{key_hash}"
            
        except Exception as e:
            logger.error(f"Error generating cache key: {e}")
            return None
    
    def _invalidate_user_cache(self, user_id: int) -> None:
        """
        Invalidate all cache entries for a specific user.
        """
        try:
            # Clear user-specific caches
            for cache_type in ['user', 'url', 'analytics']:
                cache = get_cache(cache_type)
                # Note: In a real implementation, you might want to implement
                # pattern-based invalidation or maintain a list of user-specific keys
                pass
                
        except Exception as e:
            logger.error(f"Error invalidating user cache: {e}")


class CacheInvalidationMiddleware(MiddlewareMixin):
    """
    Middleware for automatic cache invalidation on mutations.
    """
    
    def __init__(self, get_response=None):
        super().__init__(get_response)
        self.get_response = get_response
        
        # URL patterns that should trigger cache invalidation
        self.invalidation_patterns = [
            r'^/api/urls/\d+/$',  # Individual URL operations
            r'^/api/urls/create/$',  # URL creation
            r'^/api/users/profile/$',  # User profile updates
            r'^/api/users/change-password/$',  # Password changes
        ]
        
        self.compiled_patterns = [re.compile(pattern) for pattern in self.invalidation_patterns]
    
    def process_request(self, request: HttpRequest) -> Optional[HttpResponse]:
        """
        Process request to prepare for cache invalidation.
        """
        # Only process mutation requests
        if request.method not in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return None
        
        # Check if this URL matches invalidation patterns
        if any(pattern.match(request.path) for pattern in self.compiled_patterns):
            request._should_invalidate_cache = True
        
        return None
    
    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        """
        Process response to invalidate caches if needed.
        """
        # Check if we should invalidate cache
        if not hasattr(request, '_should_invalidate_cache'):
            return response
        
        # Only invalidate on successful mutations
        if response.status_code not in [200, 201, 204]:
            return response
        
        try:
            # Invalidate relevant caches
            if hasattr(request, 'user') and request.user.is_authenticated:
                self._invalidate_user_cache(request.user.id)
            
            logger.debug(f"Cache invalidated for {request.path}")
            
        except Exception as e:
            logger.error(f"Error invalidating cache: {e}")
        
        # Clean up
        if hasattr(request, '_should_invalidate_cache'):
            delattr(request, '_should_invalidate_cache')
        
        return response
    
    def _invalidate_user_cache(self, user_id: int) -> None:
        """
        Invalidate cache entries for a specific user.
        """
        try:
            # Clear user cache
            user_cache = get_cache('user')
            user_cache.delete(f"user_profile_{user_id}")
            
            # Clear URL cache
            url_cache = get_cache('url')
            url_cache.delete(f"user_urls_{user_id}")
            
            # Clear analytics cache
            analytics_cache = get_cache('analytics')
            analytics_cache.delete(f"user_stats_{user_id}")
            analytics_cache.delete(f"user_analytics_{user_id}")
            
        except Exception as e:
            logger.error(f"Error invalidating user cache: {e}")


# Convenience function to get cache rules
def get_cache_rules() -> Dict[str, Dict[str, Any]]:
    """Get current cache rules configuration."""
    return getattr(settings, 'CACHE_RULES', {})


# Convenience function to add cache rule
def add_cache_rule(pattern: str, config: Dict[str, Any]) -> None:
    """Add a new cache rule."""
    cache_rules = getattr(settings, 'CACHE_RULES', {})
    cache_rules[pattern] = config
    setattr(settings, 'CACHE_RULES', cache_rules)
