"""
In-Memory Cache System for SaaS URL Shortener

This module provides a fast, in-memory caching solution using Python's built-in
data structures. It's designed for single-server deployments and provides
excellent performance for frequently accessed data.

Features:
- LRU (Least Recently Used) eviction policy
- TTL (Time To Live) support
- Thread-safe operations
- Automatic cleanup of expired entries
- Memory usage monitoring
- Cache statistics and metrics

Usage:
    from saas_url.cache import cache
    
    # Set a value with TTL
    cache.set('key', 'value', ttl=300)  # 5 minutes
    
    # Get a value
    value = cache.get('key')
    
    # Check if key exists
    if cache.exists('key'):
        # do something
    
    # Delete a key
    cache.delete('key')
    
    # Clear all cache
    cache.clear()
    
    # Get cache statistics
    stats = cache.get_stats()
"""

import time
import threading
from collections import OrderedDict
from typing import Any, Optional, Dict, List, Tuple
import logging
import psutil
import os

logger = logging.getLogger(__name__)


class LRUCache:
    """
    Thread-safe LRU (Least Recently Used) cache implementation.
    
    Features:
    - O(1) average time complexity for get/set operations
    - Automatic eviction of least recently used items
    - TTL support for automatic expiration
    - Thread-safe operations
    - Memory usage monitoring
    """
    
    def __init__(self, max_size: int = 1000, default_ttl: int = 300):
        """
        Initialize the LRU cache.
        
        Args:
            max_size: Maximum number of items in cache
            default_ttl: Default time-to-live in seconds
        """
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.cache: OrderedDict = OrderedDict()
        self.expiry_times: Dict[str, float] = {}
        self.lock = threading.RLock()
        self.stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'deletes': 0,
            'evictions': 0,
            'expirations': 0,
            'created_at': time.time(),
            'last_cleanup': time.time(),
        }
        
        # Start cleanup thread
        self.cleanup_thread = threading.Thread(target=self._cleanup_worker, daemon=True)
        self.cleanup_thread.start()
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Set a key-value pair in the cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (uses default if None)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with self.lock:
                # Remove existing key if present
                if key in self.cache:
                    del self.cache[key]
                    del self.expiry_times[key]
                
                # Check if we need to evict items
                while len(self.cache) >= self.max_size:
                    self._evict_lru()
                
                # Set the new value
                self.cache[key] = value
                expiry_time = time.time() + (ttl or self.default_ttl)
                self.expiry_times[key] = expiry_time
                
                self.stats['sets'] += 1
                return True
                
        except Exception as e:
            logger.error(f"Error setting cache key '{key}': {e}")
            return False
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get a value from the cache.
        
        Args:
            key: Cache key
            default: Default value if key not found or expired
            
        Returns:
            Cached value or default
        """
        try:
            with self.lock:
                # Check if key exists and is not expired
                if key in self.cache:
                    if self._is_expired(key):
                        self._remove_expired(key)
                        self.stats['misses'] += 1
                        return default
                    
                    # Move to end (most recently used)
                    value = self.cache.pop(key)
                    self.cache[key] = value
                    
                    self.stats['hits'] += 1
                    return value
                
                self.stats['misses'] += 1
                return default
                
        except Exception as e:
            logger.error(f"Error getting cache key '{key}': {e}")
            return default
    
    def exists(self, key: str) -> bool:
        """
        Check if a key exists and is not expired.
        
        Args:
            key: Cache key
            
        Returns:
            True if key exists and is valid, False otherwise
        """
        try:
            with self.lock:
                if key in self.cache:
                    if self._is_expired(key):
                        self._remove_expired(key)
                        return False
                    return True
                return False
                
        except Exception as e:
            logger.error(f"Error checking cache key '{key}': {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """
        Delete a key from the cache.
        
        Args:
            key: Cache key to delete
            
        Returns:
            True if key was deleted, False otherwise
        """
        try:
            with self.lock:
                if key in self.cache:
                    del self.cache[key]
                    if key in self.expiry_times:
                        del self.expiry_times[key]
                    self.stats['deletes'] += 1
                    return True
                return False
                
        except Exception as e:
            logger.error(f"Error deleting cache key '{key}': {e}")
            return False
    
    def clear(self) -> None:
        """Clear all items from the cache."""
        try:
            with self.lock:
                self.cache.clear()
                self.expiry_times.clear()
                logger.info("Cache cleared")
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics and performance metrics.
        
        Returns:
            Dictionary containing cache statistics
        """
        try:
            with self.lock:
                current_time = time.time()
                total_requests = self.stats['hits'] + self.stats['misses']
                hit_rate = (self.stats['hits'] / total_requests * 100) if total_requests > 0 else 0
                
                # Calculate memory usage
                memory_usage = self._estimate_memory_usage()
                
                stats = {
                    **self.stats,
                    'current_size': len(self.cache),
                    'max_size': self.max_size,
                    'hit_rate': round(hit_rate, 2),
                    'memory_usage_mb': round(memory_usage / (1024 * 1024), 2),
                    'uptime_seconds': round(current_time - self.stats['created_at'], 2),
                    'last_cleanup_seconds': round(current_time - self.stats['last_cleanup'], 2),
                }
                
                return stats
                
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {}
    
    def _is_expired(self, key: str) -> bool:
        """Check if a key has expired."""
        if key not in self.expiry_times:
            return False
        return time.time() > self.expiry_times[key]
    
    def _remove_expired(self, key: str) -> None:
        """Remove an expired key from the cache."""
        try:
            del self.cache[key]
            del self.expiry_times[key]
            self.stats['expirations'] += 1
        except KeyError:
            pass
    
    def _evict_lru(self) -> None:
        """Evict the least recently used item from the cache."""
        try:
            # Remove first item (least recently used)
            key = next(iter(self.cache))
            del self.cache[key]
            if key in self.expiry_times:
                del self.expiry_times[key]
            self.stats['evictions'] += 1
        except StopIteration:
            pass
    
    def _cleanup_worker(self) -> None:
        """Background thread to clean up expired entries."""
        while True:
            try:
                time.sleep(60)  # Run every minute
                self._cleanup_expired()
            except Exception as e:
                logger.error(f"Error in cleanup worker: {e}")
    
    def _cleanup_expired(self) -> None:
        """Remove all expired entries from the cache."""
        try:
            with self.lock:
                current_time = time.time()
                expired_keys = [
                    key for key, expiry_time in self.expiry_times.items()
                    if current_time > expiry_time
                ]
                
                for key in expired_keys:
                    self._remove_expired(key)
                
                if expired_keys:
                    logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")
                
                self.stats['last_cleanup'] = current_time
                
        except Exception as e:
            logger.error(f"Error during cache cleanup: {e}")
    
    def _estimate_memory_usage(self) -> int:
        """Estimate memory usage of the cache in bytes."""
        try:
            # Rough estimation based on key-value pairs
            total_size = 0
            
            # Estimate size of keys and values
            for key, value in self.cache.items():
                # Key size (string)
                total_size += len(key.encode('utf-8'))
                
                # Value size (rough estimation)
                if isinstance(value, str):
                    total_size += len(value.encode('utf-8'))
                elif isinstance(value, (int, float)):
                    total_size += 8
                elif isinstance(value, dict):
                    total_size += len(str(value)) * 2  # Rough estimate
                elif isinstance(value, list):
                    total_size += len(value) * 8  # Rough estimate
                else:
                    total_size += len(str(value))
            
            # Add overhead for internal structures
            total_size += len(self.cache) * 64  # Dict overhead
            total_size += len(self.expiry_times) * 16  # Float overhead
            
            return total_size
            
        except Exception as e:
            logger.error(f"Error estimating memory usage: {e}")
            return 0


class CacheManager:
    """
    Central cache manager that provides multiple cache instances
    for different types of data.
    """
    
    def __init__(self):
        """Initialize the cache manager with different cache instances."""
        # URL redirect cache - fast access for redirects
        self.url_cache = LRUCache(max_size=5000, default_ttl=3600)  # 1 hour
        
        # User data cache - user profiles, settings
        self.user_cache = LRUCache(max_size=1000, default_ttl=1800)  # 30 minutes
        
        # Analytics cache - statistics, charts data
        self.analytics_cache = LRUCache(max_size=500, default_ttl=900)  # 15 minutes
        
        # Session cache - temporary data
        self.session_cache = LRUCache(max_size=2000, default_ttl=300)  # 5 minutes
        
        # General cache - miscellaneous data
        self.general_cache = LRUCache(max_size=1000, default_ttl=600)  # 10 minutes
        
        logger.info("Cache manager initialized")
    
    def get_url_cache(self) -> LRUCache:
        """Get the URL redirect cache instance."""
        return self.url_cache
    
    def get_user_cache(self) -> LRUCache:
        """Get the user data cache instance."""
        return self.user_cache
    
    def get_analytics_cache(self) -> LRUCache:
        """Get the analytics cache instance."""
        return self.analytics_cache
    
    def get_session_cache(self) -> LRUCache:
        """Get the session cache instance."""
        return self.session_cache
    
    def get_general_cache(self) -> LRUCache:
        """Get the general cache instance."""
        return self.general_cache
    
    def clear_all(self) -> None:
        """Clear all cache instances."""
        self.url_cache.clear()
        self.user_cache.clear()
        self.analytics_cache.clear()
        self.session_cache.clear()
        self.general_cache.clear()
        logger.info("All caches cleared")
    
    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics from all cache instances."""
        return {
            'url_cache': self.url_cache.get_stats(),
            'user_cache': self.user_cache.get_stats(),
            'analytics_cache': self.analytics_cache.get_stats(),
            'session_cache': self.session_cache.get_stats(),
            'general_cache': self.general_cache.get_stats(),
        }


# Global cache manager instance
cache_manager = CacheManager()

# Convenience functions for backward compatibility
def get_cache(cache_type: str = 'general') -> LRUCache:
    """
    Get a specific cache instance by type.
    
    Args:
        cache_type: Type of cache ('url', 'user', 'analytics', 'session', 'general')
        
    Returns:
        LRUCache instance
    """
    cache_map = {
        'url': cache_manager.get_url_cache,
        'user': cache_manager.get_user_cache,
        'analytics': cache_manager.get_analytics_cache,
        'session': cache_manager.get_session_cache,
        'general': cache_manager.get_general_cache,
    }
    
    getter = cache_map.get(cache_type, cache_manager.get_general_cache)
    return getter()


# Legacy cache instance for backward compatibility
cache = cache_manager.get_general_cache()
