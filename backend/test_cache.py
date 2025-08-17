#!/usr/bin/env python3
"""
Test script for the in-memory cache system.

This script demonstrates the various features of the cache system
and can be used to verify functionality during development.

Usage:
    python test_cache.py
"""

import os
import sys
import django
import time
import threading

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_url.settings')
django.setup()

from saas_url.cache import cache_manager, get_cache
from saas_url.cache_decorators import cache_result, cache_view


def test_basic_cache_operations():
    """Test basic cache operations."""
    print("=== Testing Basic Cache Operations ===")
    
    # Get different cache instances
    url_cache = get_cache('url')
    user_cache = get_cache('user')
    analytics_cache = get_cache('analytics')
    
    # Test set/get operations
    url_cache.set('test_key', 'test_value', ttl=60)
    value = url_cache.get('test_key')
    print(f"URL Cache - Set/Get: {value}")
    
    # Test TTL
    user_cache.set('expiring_key', 'expiring_value', ttl=2)
    print(f"User Cache - Before expiry: {user_cache.get('expiring_key')}")
    time.sleep(3)
    print(f"User Cache - After expiry: {user_cache.get('expiring_key')}")
    
    # Test exists and delete
    analytics_cache.set('delete_key', 'delete_value')
    print(f"Analytics Cache - Exists before delete: {analytics_cache.exists('delete_key')}")
    analytics_cache.delete('delete_key')
    print(f"Analytics Cache - Exists after delete: {analytics_cache.exists('delete_key')}")
    
    print()


def test_cache_decorators():
    """Test cache decorators."""
    print("=== Testing Cache Decorators ===")
    
    @cache_result(ttl=300, cache_type='analytics')
    def expensive_calculation(user_id):
        """Simulate expensive calculation."""
        print(f"  Executing expensive calculation for user {user_id}")
        time.sleep(0.1)  # Simulate work
        return f"result_for_user_{user_id}"
    
    # First call - should execute function
    result1 = expensive_calculation(123)
    print(f"  First call result: {result1}")
    
    # Second call - should return cached result
    result2 = expensive_calculation(123)
    print(f"  Second call result: {result2}")
    
    # Different user - should execute function again
    result3 = expensive_calculation(456)
    print(f"  Different user result: {result3}")
    
    print()


def test_cache_performance():
    """Test cache performance."""
    print("=== Testing Cache Performance ===")
    
    url_cache = get_cache('url')
    
    # Test cache performance with many operations
    start_time = time.time()
    
    for i in range(1000):
        url_cache.set(f"perf_key_{i}", f"perf_value_{i}", ttl=300)
    
    set_time = time.time() - start_time
    print(f"  Set 1000 keys: {set_time:.4f} seconds")
    
    start_time = time.time()
    for i in range(1000):
        url_cache.get(f"perf_key_{i}")
    
    get_time = time.time() - start_time
    print(f"  Get 1000 keys: {get_time:.4f} seconds")
    
    # Test cache statistics
    stats = url_cache.get_stats()
    print(f"  Cache stats: {stats['hits']} hits, {stats['misses']} misses")
    
    print()


def test_concurrent_access():
    """Test cache with concurrent access."""
    print("=== Testing Concurrent Access ===")
    
    url_cache = get_cache('url')
    
    def worker(worker_id):
        """Worker function for concurrent testing."""
        for i in range(100):
            key = f"concurrent_key_{worker_id}_{i}"
            url_cache.set(key, f"value_{worker_id}_{i}", ttl=60)
            value = url_cache.get(key)
            if value != f"value_{worker_id}_{i}":
                print(f"  Worker {worker_id}: Cache inconsistency detected!")
    
    # Start multiple threads
    threads = []
    for i in range(5):
        thread = threading.Thread(target=worker, args=(i,))
        threads.append(thread)
        thread.start()
    
    # Wait for all threads to complete
    for thread in threads:
        thread.join()
    
    print("  All workers completed successfully")
    print()


def test_cache_manager():
    """Test cache manager functionality."""
    print("=== Testing Cache Manager ===")
    
    # Get all cache statistics
    all_stats = cache_manager.get_all_stats()
    
    print("  Cache Manager Statistics:")
    for cache_name, stats in all_stats.items():
        print(f"    {cache_name}: {stats['current_size']}/{stats['max_size']} items, "
              f"{stats['memory_usage_mb']:.2f} MB")
    
    # Test clearing specific cache
    url_cache = cache_manager.get_url_cache()
    url_cache.set('manager_test_key', 'manager_test_value')
    print(f"  Before clear: {url_cache.get('manager_test_key')}")
    
    cache_manager.get_url_cache().clear()
    print(f"  After clear: {url_cache.get('manager_test_key')}")
    
    print()


def test_memory_management():
    """Test memory management features."""
    print("=== Testing Memory Management ===")
    
    analytics_cache = get_cache('analytics')
    
    # Fill cache to trigger eviction
    for i in range(600):  # More than max_size (500)
        analytics_cache.set(f"memory_key_{i}", f"memory_value_{i}" * 100, ttl=300)
    
    stats = analytics_cache.get_stats()
    print(f"  Cache size after filling: {stats['current_size']}")
    print(f"  Evictions: {stats['evictions']}")
    print(f"  Memory usage: {stats['memory_usage_mb']:.2f} MB")
    
    print()


def test_cache_health():
    """Test cache health monitoring."""
    print("=== Testing Cache Health ===")
    
    # Simulate some cache activity
    url_cache = get_cache('url')
    user_cache = get_cache('user')
    
    for i in range(100):
        url_cache.set(f"health_key_{i}", f"health_value_{i}")
        user_cache.set(f"health_user_{i}", f"health_user_value_{i}")
    
    # Get health status
    from saas_url.cache_views import CacheHealthView
    from django.test import RequestFactory
    from django.contrib.auth.models import User
    
    # Create a mock request
    factory = RequestFactory()
    request = factory.get('/api/cache/health/')
    
    # Create a mock user for testing
    try:
        user = User.objects.create_user(username='testuser', password='testpass')
        request.user = user
        
        # Test health view
        health_view = CacheHealthView()
        response = health_view.get(request)
        
        if response.status_code == 200:
            health_data = response.data
            print(f"  Cache health status: {health_data['status']}")
            print(f"  Total memory usage: {health_data['total_memory_mb']:.2f} MB")
            print(f"  Total entries: {health_data['total_entries']}")
            
            if health_data['issues']:
                print("  Issues detected:")
                for issue in health_data['issues']:
                    print(f"    - {issue}")
        
        # Clean up test user
        user.delete()
        
    except Exception as e:
        print(f"  Health check failed: {e}")
    
    print()


def main():
    """Run all cache tests."""
    print("Starting Cache System Tests\n")
    
    try:
        test_basic_cache_operations()
        test_cache_decorators()
        test_cache_performance()
        test_concurrent_access()
        test_cache_manager()
        test_memory_management()
        test_cache_health()
        
        print("=== All Tests Completed Successfully ===")
        
    except Exception as e:
        print(f"Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)
