"""
Cache Management Views

This module provides API endpoints for monitoring and managing the in-memory cache system.
It allows administrators to view cache statistics, clear caches, and monitor performance.

Endpoints:
- GET /api/cache/stats/ - Get cache statistics
- POST /api/cache/clear/ - Clear all caches
- POST /api/cache/clear/{cache_type}/ - Clear specific cache type
- GET /api/cache/health/ - Get cache health status
"""

from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import logging
import psutil
import time

from .cache import cache_manager, get_cache
from .cache_decorators import invalidate_cache_pattern

logger = logging.getLogger(__name__)


class CacheStatsView(APIView):
    """
    View for getting cache statistics and performance metrics.
    """
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """Get comprehensive cache statistics."""
        try:
            # Get stats from all cache instances
            cache_stats = cache_manager.get_all_stats()
            
            # Get system memory info
            memory_info = psutil.virtual_memory()
            process = psutil.Process()
            
            # Calculate overall cache performance
            total_hits = sum(stats.get('hits', 0) for stats in cache_stats.values())
            total_misses = sum(stats.get('misses', 0) for stats in cache_stats.values())
            total_requests = total_hits + total_misses
            overall_hit_rate = (total_hits / total_requests * 100) if total_requests > 0 else 0
            
            # Calculate total memory usage
            total_cache_memory = sum(stats.get('memory_usage_mb', 0) for stats in cache_stats.values())
            
            response_data = {
                'timestamp': time.time(),
                'overall_performance': {
                    'total_requests': total_requests,
                    'total_hits': total_hits,
                    'total_misses': total_misses,
                    'overall_hit_rate': round(overall_hit_rate, 2),
                    'total_cache_memory_mb': round(total_cache_memory, 2),
                },
                'system_info': {
                    'system_memory_total_gb': round(memory_info.total / (1024**3), 2),
                    'system_memory_available_gb': round(memory_info.available / (1024**3), 2),
                    'system_memory_percent_used': round(memory_info.percent, 2),
                    'process_memory_mb': round(process.memory_info().rss / (1024**2), 2),
                },
                'cache_instances': cache_stats,
            }
            
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return Response(
                {'error': 'Failed to get cache statistics'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CacheClearView(APIView):
    """
    View for clearing cache instances.
    """
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request, cache_type=None):
        """
        Clear cache instances.
        
        Args:
            cache_type: Optional cache type to clear ('url', 'user', 'analytics', 'session', 'general')
                        If None, clears all caches
        """
        try:
            if cache_type:
                # Clear specific cache type
                if cache_type not in ['url', 'user', 'analytics', 'session', 'general']:
                    return Response(
                        {'error': f'Invalid cache type: {cache_type}'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                cache = get_cache(cache_type)
                cache.clear()
                
                logger.info(f"Cache '{cache_type}' cleared by admin {request.user.username}")
                
                return Response({
                    'message': f'Cache "{cache_type}" cleared successfully',
                    'cache_type': cache_type,
                    'timestamp': time.time()
                })
            else:
                # Clear all caches
                cache_manager.clear_all()
                
                logger.info(f"All caches cleared by admin {request.user.username}")
                
                return Response({
                    'message': 'All caches cleared successfully',
                    'timestamp': time.time()
                })
                
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return Response(
                {'error': 'Failed to clear cache'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CacheHealthView(APIView):
    """
    View for checking cache health status.
    """
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """Get cache health status and basic metrics."""
        try:
            # Get basic stats from all caches
            cache_stats = cache_manager.get_all_stats()
            
            # Check if caches are functioning
            health_status = 'healthy'
            issues = []
            
            for cache_name, stats in cache_stats.items():
                # Check if cache has reasonable hit rate
                hit_rate = stats.get('hit_rate', 0)
                if hit_rate < 10:  # Less than 10% hit rate might indicate issues
                    issues.append(f"{cache_name}: Low hit rate ({hit_rate}%)")
                
                # Check if cache is not too full
                current_size = stats.get('current_size', 0)
                max_size = stats.get('max_size', 1000)
                if current_size > max_size * 0.9:  # More than 90% full
                    issues.append(f"{cache_name}: High memory usage ({current_size}/{max_size})")
            
            if issues:
                health_status = 'warning'
            
            # Get memory usage
            total_memory = sum(stats.get('memory_usage_mb', 0) for stats in cache_stats.values())
            
            response_data = {
                'status': health_status,
                'timestamp': time.time(),
                'total_memory_mb': round(total_memory, 2),
                'total_entries': sum(stats.get('current_size', 0) for stats in cache_stats.values()),
                'issues': issues,
                'cache_count': len(cache_stats),
            }
            
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Error checking cache health: {e}")
            return Response(
                {'error': 'Failed to check cache health'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def cache_keys_view(request, cache_type='general'):
    """
    Get a sample of cache keys for debugging purposes.
    Note: This is for development/debugging only.
    """
    try:
        cache = get_cache(cache_type)
        
        # Get cache stats
        stats = cache.get_stats()
        
        # Note: In a real implementation, you might want to implement
        # a way to list actual cache keys, but for now we'll just return stats
        
        response_data = {
            'cache_type': cache_type,
            'stats': stats,
            'note': 'Key listing not implemented for security reasons',
            'timestamp': time.time()
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error getting cache keys: {e}")
        return Response(
            {'error': 'Failed to get cache keys'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def cache_invalidate_pattern_view(request):
    """
    Invalidate cache keys matching a pattern.
    """
    try:
        pattern = request.data.get('pattern')
        cache_type = request.data.get('cache_type', 'general')
        
        if not pattern:
            return Response(
                {'error': 'Pattern is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Invalidate cache pattern
        invalidated_count = invalidate_cache_pattern(pattern, cache_type)
        
        logger.info(f"Cache pattern '{pattern}' invalidated by admin {request.user.username}")
        
        return Response({
            'message': f'Cache pattern "{pattern}" invalidated',
            'invalidated_count': invalidated_count,
            'cache_type': cache_type,
            'timestamp': time.time()
        })
        
    except Exception as e:
        logger.error(f"Error invalidating cache pattern: {e}")
        return Response(
            {'error': 'Failed to invalidate cache pattern'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def cache_performance_view(request):
    """
    Get detailed cache performance metrics.
    """
    try:
        # Get stats from all caches
        cache_stats = cache_manager.get_all_stats()
        
        # Calculate performance metrics
        performance_data = {}
        
        for cache_name, stats in cache_stats.items():
            hits = stats.get('hits', 0)
            misses = stats.get('misses', 0)
            total = hits + misses
            
            if total > 0:
                hit_rate = (hits / total) * 100
                avg_response_time = stats.get('avg_response_time', 0)
                
                performance_data[cache_name] = {
                    'hit_rate': round(hit_rate, 2),
                    'total_requests': total,
                    'hits': hits,
                    'misses': misses,
                    'evictions': stats.get('evictions', 0),
                    'expirations': stats.get('expirations', 0),
                    'memory_usage_mb': stats.get('memory_usage_mb', 0),
                    'uptime_seconds': stats.get('uptime_seconds', 0),
                }
        
        # Calculate overall performance
        total_hits = sum(data['hits'] for data in performance_data.values())
        total_requests = sum(data['total_requests'] for data in performance_data.values())
        overall_hit_rate = (total_hits / total_requests * 100) if total_requests > 0 else 0
        
        response_data = {
            'overall_performance': {
                'hit_rate': round(overall_hit_rate, 2),
                'total_requests': total_requests,
                'total_hits': total_hits,
            },
            'cache_performance': performance_data,
            'timestamp': time.time(),
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error getting cache performance: {e}")
        return Response(
            {'error': 'Failed to get cache performance'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
