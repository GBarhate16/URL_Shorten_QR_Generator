"""
Performance Monitoring Views

This module provides API endpoints for monitoring application performance
and getting optimization recommendations.
"""

from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import JsonResponse
from django.core.cache import cache
from django.db import connection
from django.conf import settings
import psutil
import time
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class PerformanceMetricsView(APIView):
    """
    View for getting comprehensive performance metrics.
    """
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """Get comprehensive performance metrics."""
        try:
            # Get system metrics
            system_metrics = self._get_system_metrics()
            
            # Get application metrics
            app_metrics = self._get_application_metrics()
            
            # Get database metrics
            db_metrics = self._get_database_metrics()
            
            # Get cache metrics
            cache_metrics = self._get_cache_metrics()
            
            # Get performance recommendations
            recommendations = self._get_performance_recommendations()
            
            response_data = {
                'timestamp': time.time(),
                'system': system_metrics,
                'application': app_metrics,
                'database': db_metrics,
                'cache': cache_metrics,
                'recommendations': recommendations,
            }
            
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Error getting performance metrics: {e}")
            return Response(
                {'error': 'Failed to get performance metrics'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_system_metrics(self) -> Dict[str, Any]:
        """Get system-level performance metrics."""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            
            # Memory metrics
            memory = psutil.virtual_memory()
            memory_metrics = {
                'total_gb': round(memory.total / (1024**3), 2),
                'available_gb': round(memory.available / (1024**3), 2),
                'used_gb': round(memory.used / (1024**3), 2),
                'percent_used': round(memory.percent, 2),
            }
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            disk_metrics = {
                'total_gb': round(disk.total / (1024**3), 2),
                'used_gb': round(disk.used / (1024**3), 2),
                'free_gb': round(disk.free / (1024**3), 2),
                'percent_used': round((disk.used / disk.total) * 100, 2),
            }
            
            # Network metrics
            network = psutil.net_io_counters()
            network_metrics = {
                'bytes_sent_mb': round(network.bytes_sent / (1024**2), 2),
                'bytes_recv_mb': round(network.bytes_recv / (1024**2), 2),
            }
            
            return {
                'cpu': {
                    'usage_percent': cpu_percent,
                    'core_count': cpu_count,
                },
                'memory': memory_metrics,
                'disk': disk_metrics,
                'network': network_metrics,
            }
            
        except Exception as e:
            logger.error(f"Error getting system metrics: {e}")
            return {}
    
    def _get_application_metrics(self) -> Dict[str, Any]:
        """Get application-level performance metrics."""
        try:
            # Get process metrics
            process = psutil.Process()
            
            # Memory usage
            memory_info = process.memory_info()
            memory_metrics = {
                'rss_mb': round(memory_info.rss / (1024**2), 2),
                'vms_mb': round(memory_info.vms / (1024**2), 2),
            }
            
            # CPU usage
            cpu_percent = process.cpu_percent()
            
            # Thread count
            thread_count = process.num_threads()
            
            # Open files
            open_files = len(process.open_files())
            
            # Connections
            connections = len(process.connections())
            
            return {
                'memory': memory_metrics,
                'cpu_percent': cpu_percent,
                'thread_count': thread_count,
                'open_files': open_files,
                'connections': connections,
            }
            
        except Exception as e:
            logger.error(f"Error getting application metrics: {e}")
            return {}
    
    def _get_database_metrics(self) -> Dict[str, Any]:
        """Get database performance metrics."""
        try:
            # Check if queries logging is properly configured
            if not hasattr(connection, 'queries') or not isinstance(connection.queries, list):
                return {
                    'total_queries': 0,
                    'avg_query_time_ms': 0,
                    'max_query_time_ms': 0,
                    'total_query_time_ms': 0,
                    'slow_queries_count': 0,
                    'slow_queries': [],
                }
            
            # Query count
            query_count = len(connection.queries)
            
            # Query time analysis
            query_times = []
            slow_queries = []
            
            for query in connection.queries:
                time_taken = float(query.get('time', 0))
                query_times.append(time_taken)
                
                if time_taken > 0.1:  # Queries taking more than 100ms
                    slow_queries.append({
                        'sql': query.get('sql', '')[:100] + '...',
                        'time': time_taken,
                    })
            
            # Calculate statistics
            if query_times:
                avg_query_time = sum(query_times) / len(query_times)
                max_query_time = max(query_times)
                total_query_time = sum(query_times)
            else:
                avg_query_time = max_query_time = total_query_time = 0
            
            return {
                'total_queries': query_count,
                'avg_query_time_ms': round(avg_query_time * 1000, 2),
                'max_query_time_ms': round(max_query_time * 1000, 2),
                'total_query_time_ms': round(total_query_time * 1000, 2),
                'slow_queries_count': len(slow_queries),
                'slow_queries': slow_queries[:10],  # Top 10 slow queries
            }
            
        except Exception as e:
            logger.error(f"Error getting database metrics: {e}")
            return {}
    
    def _get_cache_metrics(self) -> Dict[str, Any]:
        """Get cache performance metrics."""
        try:
            # Get cache stats from our cache system
            from .cache import cache_manager
            cache_stats = cache_manager.get_all_stats()
            
            # Calculate overall cache performance
            total_hits = sum(stats.get('hits', 0) for stats in cache_stats.values())
            total_misses = sum(stats.get('misses', 0) for stats in cache_stats.values())
            total_requests = total_hits + total_misses
            overall_hit_rate = (total_hits / total_requests * 100) if total_requests > 0 else 0
            
            # Get memory usage
            total_memory = sum(stats.get('memory_usage_mb', 0) for stats in cache_stats.values())
            
            return {
                'overall_hit_rate': round(overall_hit_rate, 2),
                'total_requests': total_requests,
                'total_hits': total_hits,
                'total_misses': total_misses,
                'total_memory_mb': round(total_memory, 2),
                'cache_instances': len(cache_stats),
            }
            
        except Exception as e:
            logger.error(f"Error getting cache metrics: {e}")
            return {}
    
    def _get_performance_recommendations(self) -> List[Dict[str, Any]]:
        """Get performance optimization recommendations."""
        recommendations = []
        
        try:
            # System recommendations
            memory = psutil.virtual_memory()
            if memory.percent > 80:
                recommendations.append({
                    'category': 'system',
                    'priority': 'high',
                    'title': 'High Memory Usage',
                    'description': f'Memory usage is at {memory.percent}%. Consider optimizing memory usage or increasing RAM.',
                    'action': 'Monitor memory usage and optimize application memory consumption.'
                })
            
            # Database recommendations
            if hasattr(connection, 'queries') and isinstance(connection.queries, list) and len(connection.queries) > 20:
                recommendations.append({
                    'category': 'database',
                    'priority': 'medium',
                    'title': 'High Query Count',
                    'description': f'Request executed {len(connection.queries) if hasattr(connection, "queries") and isinstance(connection.queries, list) else 0} database queries.',
                    'action': 'Review and optimize database queries, add caching where appropriate.'
                })
            
            # Cache recommendations
            from .cache import cache_manager
            cache_stats = cache_manager.get_all_stats()
            
            for cache_name, stats in cache_stats.items():
                hit_rate = stats.get('hit_rate', 0)
                if hit_rate < 50:
                    recommendations.append({
                        'category': 'cache',
                        'priority': 'medium',
                        'title': f'Low Cache Hit Rate for {cache_name}',
                        'description': f'Cache hit rate is {hit_rate}%, indicating poor cache utilization.',
                        'action': 'Review cache keys, TTL settings, and cache invalidation strategy.'
                    })
            
            # General recommendations
            if not recommendations:
                recommendations.append({
                    'category': 'general',
                    'priority': 'low',
                    'title': 'Performance is Good',
                    'description': 'Current performance metrics are within acceptable ranges.',
                    'action': 'Continue monitoring and consider proactive optimizations.'
                })
            
        except Exception as e:
            logger.error(f"Error getting performance recommendations: {e}")
            recommendations.append({
                'category': 'error',
                'priority': 'high',
                'title': 'Error Getting Recommendations',
                'description': f'Failed to analyze performance: {e}',
                'action': 'Check logs and restart monitoring service.'
            })
        
        return recommendations


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def endpoint_performance_view(request):
    """Get performance metrics for specific endpoints."""
    try:
        # Get endpoint performance metrics from cache
        endpoint_metrics = {}
        
        # Search for performance metrics in cache
        for key in cache._cache.keys():
            if key.startswith('perf_metrics:'):
                endpoint = key.replace('perf_metrics:', '')
                metrics = cache.get(key)
                if metrics:
                    endpoint_metrics[endpoint] = metrics
        
        # Calculate top slow endpoints
        slow_endpoints = sorted(
            endpoint_metrics.items(),
            key=lambda x: x[1].get('avg_time', 0),
            reverse=True
        )[:10]
        
        # Calculate top high-query endpoints
        high_query_endpoints = sorted(
            endpoint_metrics.items(),
            key=lambda x: x[1].get('avg_queries', 0),
            reverse=True
        )[:10]
        
        response_data = {
            'timestamp': time.time(),
            'total_endpoints': len(endpoint_metrics),
            'slow_endpoints': [
                {
                    'endpoint': endpoint,
                    'avg_time': metrics.get('avg_time', 0),
                    'max_time': metrics.get('max_time', 0),
                    'request_count': metrics.get('count', 0),
                }
                for endpoint, metrics in slow_endpoints
            ],
            'high_query_endpoints': [
                {
                    'endpoint': endpoint,
                    'avg_queries': metrics.get('avg_queries', 0),
                    'max_queries': metrics.get('max_queries', 0),
                    'request_count': metrics.get('count', 0),
                }
                for endpoint, metrics in high_query_endpoints
            ],
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error getting endpoint performance: {e}")
        return Response(
            {'error': 'Failed to get endpoint performance'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def clear_performance_metrics_view(request):
    """Clear performance metrics cache."""
    try:
        # Clear performance metrics
        cleared_count = 0
        
        for key in list(cache._cache.keys()):
            if key.startswith('perf_metrics:'):
                cache.delete(key)
                cleared_count += 1
        
        return Response({
            'message': f'Cleared {cleared_count} performance metrics',
            'cleared_count': cleared_count,
            'timestamp': time.time()
        })
        
    except Exception as e:
        logger.error(f"Error clearing performance metrics: {e}")
        return Response(
            {'error': 'Failed to clear performance metrics'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def performance_health_view(request):
    """Get performance health status."""
    try:
        # Check system health
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Define health thresholds
        health_status = 'healthy'
        issues = []
        
        # Memory health
        if memory.percent > 90:
            health_status = 'critical'
            issues.append(f'Memory usage critical: {memory.percent}%')
        elif memory.percent > 80:
            health_status = 'warning'
            issues.append(f'Memory usage high: {memory.percent}%')
        
        # Disk health
        if disk.percent > 90:
            health_status = 'critical'
            issues.append(f'Disk usage critical: {disk.percent}%')
        elif disk.percent > 80:
            health_status = 'warning'
            issues.append(f'Disk usage high: {disk.percent}%')
        
        # Database health
        if hasattr(connection, 'queries') and isinstance(connection.queries, list) and len(connection.queries) > 50:
            health_status = 'warning'
            issues.append(f'High query count: {len(connection.queries)} queries')
        
        # Cache health
        from .cache import cache_manager
        cache_stats = cache_manager.get_all_stats()
        
        for cache_name, stats in cache_stats.items():
            hit_rate = stats.get('hit_rate', 0)
            if hit_rate < 30:
                health_status = 'warning'
                issues.append(f'Cache {cache_name} hit rate low: {hit_rate}%')
        
        response_data = {
            'status': health_status,
            'timestamp': time.time(),
            'issues': issues,
            'system': {
                'memory_percent': memory.percent,
                'disk_percent': disk.percent,
                'query_count': len(connection.queries) if hasattr(connection, 'queries') and isinstance(connection.queries, list) else 0,
            }
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error getting performance health: {e}")
        return Response(
            {'error': 'Failed to get performance health'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
