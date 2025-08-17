"""
Cache Decorators for Django Views and Functions

This module provides decorators to easily cache function results
and view responses for improved performance.

Usage:
    from saas_url.cache_decorators import cache_result, cache_view
    
    # Cache function result
    @cache_result(ttl=300, cache_type='analytics')
    def expensive_calculation(user_id):
        # ... expensive operation
        return result
    
    # Cache view response
    @cache_view(ttl=600, cache_type='url')
    def my_view(request):
        # ... view logic
        return response
"""

import functools
import hashlib
import json
import logging
from typing import Any, Callable, Optional, Union
from django.http import HttpRequest, HttpResponse
from django.core.cache import cache as django_cache
from .cache import get_cache, cache_manager

logger = logging.getLogger(__name__)


def generate_cache_key(func_name: str, args: tuple, kwargs: dict, prefix: str = '') -> str:
    """
    Generate a unique cache key for function arguments.
    
    Args:
        func_name: Name of the function
        args: Function arguments
        kwargs: Function keyword arguments
        prefix: Optional prefix for the cache key
        
    Returns:
        Unique cache key string
    """
    try:
        # Convert args and kwargs to a stable string representation
        args_str = str(args)
        kwargs_str = str(sorted(kwargs.items()))
        
        # Create a hash of the arguments
        key_data = f"{func_name}:{args_str}:{kwargs_str}"
        key_hash = hashlib.md5(key_data.encode('utf-8')).hexdigest()
        
        if prefix:
            return f"{prefix}:{key_hash}"
        return key_hash
        
    except Exception as e:
        logger.error(f"Error generating cache key: {e}")
        # Fallback to a simple key
        return f"{func_name}:{hash(str(args) + str(kwargs))}"


def cache_result(ttl: int = 300, cache_type: str = 'general', key_prefix: str = ''):
    """
    Decorator to cache function results.
    
    Args:
        ttl: Time to live in seconds
        cache_type: Type of cache to use ('url', 'user', 'analytics', 'session', 'general')
        key_prefix: Optional prefix for cache keys
        
    Returns:
        Decorated function
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            try:
                # Get the appropriate cache instance
                cache = get_cache(cache_type)
                
                # Generate cache key
                cache_key = generate_cache_key(
                    func.__name__, args, kwargs, key_prefix
                )
                
                # Try to get from cache
                cached_result = cache.get(cache_key)
                if cached_result is not None:
                    logger.debug(f"Cache HIT for {func.__name__}: {cache_key}")
                    return cached_result
                
                # Cache miss - execute function
                logger.debug(f"Cache MISS for {func.__name__}: {cache_key}")
                result = func(*args, **kwargs)
                
                # Cache the result
                cache.set(cache_key, result, ttl=ttl)
                
                return result
                
            except Exception as e:
                logger.error(f"Cache error in {func.__name__}: {e}")
                # Fallback to executing function without caching
                return func(*args, **kwargs)
        
        return wrapper
    return decorator


def cache_view(ttl: int = 300, cache_type: str = 'general', key_prefix: str = '', 
               vary_by_user: bool = True, vary_by_method: bool = True):
    """
    Decorator to cache Django view responses.
    
    Args:
        ttl: Time to live in seconds
        cache_type: Type of cache to use
        key_prefix: Optional prefix for cache keys
        vary_by_user: Whether to vary cache by user
        vary_by_method: Whether to vary cache by HTTP method
        
    Returns:
        Decorated view function
    """
    def decorator(view_func: Callable) -> Callable:
        @functools.wraps(view_func)
        def wrapper(request: HttpRequest, *args, **kwargs):
            try:
                # Skip caching for non-GET requests
                if request.method != 'GET':
                    return view_func(request, *args, **kwargs)
                
                # Get the appropriate cache instance
                cache = get_cache(cache_type)
                
                # Generate cache key based on request
                cache_key_parts = [view_func.__name__]
                
                if vary_by_method:
                    cache_key_parts.append(request.method)
                
                if vary_by_user and hasattr(request, 'user') and request.user.is_authenticated:
                    cache_key_parts.append(f"user_{request.user.id}")
                
                # Add URL path and query parameters
                cache_key_parts.append(request.path)
                if request.GET:
                    cache_key_parts.append(str(sorted(request.GET.items())))
                
                # Add additional args and kwargs
                if args:
                    cache_key_parts.append(str(args))
                if kwargs:
                    cache_key_parts.append(str(sorted(kwargs.items())))
                
                cache_key = generate_cache_key(
                    view_func.__name__, 
                    tuple(cache_key_parts), 
                    {}, 
                    key_prefix
                )
                
                # Try to get from cache
                cached_response = cache.get(cache_key)
                if cached_response is not None:
                    logger.debug(f"Cache HIT for view {view_func.__name__}: {cache_key}")
                    return cached_response
                
                # Cache miss - execute view
                logger.debug(f"Cache MISS for view {view_func.__name__}: {cache_key}")
                response = view_func(request, *args, **kwargs)
                
                # Only cache successful responses
                if response.status_code == 200:
                    cache.set(cache_key, response, ttl=ttl)
                
                return response
                
            except Exception as e:
                logger.error(f"Cache error in view {view_func.__name__}: {e}")
                # Fallback to executing view without caching
                return view_func(request, *args, **kwargs)
        
        return wrapper
    return decorator


def cache_method_result(ttl: int = 300, cache_type: str = 'general', key_prefix: str = ''):
    """
    Decorator to cache method results in classes.
    
    Args:
        ttl: Time to live in seconds
        cache_type: Type of cache to use
        key_prefix: Optional prefix for cache keys
        
    Returns:
        Decorated method
    """
    def decorator(method: Callable) -> Callable:
        @functools.wraps(method)
        def wrapper(self, *args, **kwargs):
            try:
                # Get the appropriate cache instance
                cache = get_cache(cache_type)
                
                # Include instance info in cache key
                instance_id = getattr(self, 'id', None) or id(self)
                cache_key_parts = [
                    f"{self.__class__.__name__}_{instance_id}",
                    method.__name__
                ]
                
                if args:
                    cache_key_parts.append(str(args))
                if kwargs:
                    cache_key_parts.append(str(sorted(kwargs.items())))
                
                cache_key = generate_cache_key(
                    method.__name__, 
                    tuple(cache_key_parts), 
                    {}, 
                    key_prefix
                )
                
                # Try to get from cache
                cached_result = cache.get(cache_key)
                if cached_result is not None:
                    logger.debug(f"Cache HIT for method {method.__name__}: {cache_key}")
                    return cached_result
                
                # Cache miss - execute method
                logger.debug(f"Cache MISS for method {method.__name__}: {cache_key}")
                result = method(self, *args, **kwargs)
                
                # Cache the result
                cache.set(cache_key, result, ttl=ttl)
                
                return result
                
            except Exception as e:
                logger.error(f"Cache error in method {method.__name__}: {e}")
                # Fallback to executing method without caching
                return method(self, *args, **kwargs)
        
        return wrapper
    return decorator


def invalidate_cache_pattern(pattern: str, cache_type: str = 'general'):
    """
    Invalidate all cache keys matching a pattern.
    
    Args:
        pattern: Pattern to match against cache keys
        cache_type: Type of cache to search in
        
    Returns:
        Number of keys invalidated
    """
    try:
        cache = get_cache(cache_type)
        # Note: This is a simplified implementation
        # In a real scenario, you might want to implement pattern matching
        # or use a more sophisticated key management system
        
        # For now, we'll clear the entire cache if pattern matches
        if pattern in ['*', 'all']:
            cache.clear()
            return 1
        
        return 0
        
    except Exception as e:
        logger.error(f"Error invalidating cache pattern {pattern}: {e}")
        return 0


def cache_queryset(ttl: int = 300, cache_type: str = 'general', key_prefix: str = ''):
    """
    Decorator to cache Django QuerySet results.
    
    Args:
        ttl: Time to live in seconds
        cache_type: Type of cache to use
        key_prefix: Optional prefix for cache keys
        
    Returns:
        Decorated function
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            try:
                # Get the appropriate cache instance
                cache = get_cache(cache_type)
                
                # Generate cache key
                cache_key = generate_cache_key(
                    func.__name__, args, kwargs, key_prefix
                )
                
                # Try to get from cache
                cached_result = cache.get(cache_key)
                if cached_result is not None:
                    logger.debug(f"Cache HIT for queryset {func.__name__}: {cache_key}")
                    return cached_result
                
                # Cache miss - execute function
                logger.debug(f"Cache MISS for queryset {func.__name__}: {cache_key}")
                result = func(*args, **kwargs)
                
                # For QuerySets, we need to evaluate them before caching
                if hasattr(result, '_prefetch_related_lookups'):
                    # It's a QuerySet, evaluate it
                    result = list(result)
                
                # Cache the result
                cache.set(cache_key, result, ttl=ttl)
                
                return result
                
            except Exception as e:
                logger.error(f"Cache error in queryset {func.__name__}: {e}")
                # Fallback to executing function without caching
                return func(*args, **kwargs)
        
        return wrapper
    return decorator


# Convenience decorators for common use cases
cache_url = lambda ttl=3600: cache_result(ttl=ttl, cache_type='url')
cache_user = lambda ttl=1800: cache_result(ttl=ttl, cache_type='user')
cache_analytics = lambda ttl=900: cache_result(ttl=ttl, cache_type='analytics')
cache_session = lambda ttl=300: cache_result(ttl=ttl, cache_type='session')

cache_url_view = lambda ttl=3600: cache_view(ttl=ttl, cache_type='url')
cache_user_view = lambda ttl=1800: cache_view(ttl=ttl, cache_type='user')
cache_analytics_view = lambda ttl=900: cache_view(ttl=ttl, cache_type='analytics')
