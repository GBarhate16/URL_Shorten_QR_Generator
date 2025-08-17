"""
Database Optimization Utilities

This module provides utilities for optimizing database performance:
- Query optimization
- Connection pooling
- Performance monitoring
- Index recommendations
"""

import logging
import time
from typing import Dict, List, Any, Optional
from django.db import connection, models
from django.db.models import QuerySet
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)


class QueryOptimizer:
    """
    Utility class for optimizing database queries.
    """
    
    @staticmethod
    def optimize_queryset(queryset: QuerySet, **kwargs) -> QuerySet:
        """
        Apply common optimizations to a queryset.
        
        Args:
            queryset: The queryset to optimize
            **kwargs: Optimization options
            
        Returns:
            Optimized queryset
        """
        try:
            # Apply select_related for foreign keys
            if kwargs.get('select_related'):
                queryset = queryset.select_related(*kwargs['select_related'])
            
            # Apply prefetch_related for many-to-many and reverse foreign keys
            if kwargs.get('prefetch_related'):
                queryset = queryset.prefetch_related(*kwargs['prefetch_related'])
            
            # Apply only for specific fields
            if kwargs.get('only'):
                queryset = queryset.only(*kwargs['only'])
            
            # Apply defer for fields to exclude
            if kwargs.get('defer'):
                queryset = queryset.defer(*kwargs['defer'])
            
            # Apply distinct to remove duplicates
            if kwargs.get('distinct', False):
                queryset = queryset.distinct()
            
            return queryset
            
        except Exception as e:
            logger.error(f"Error optimizing queryset: {e}")
            return queryset
    
    @staticmethod
    def get_optimized_user_urls(user_id: int) -> QuerySet:
        """
        Get optimized queryset for user URLs with proper joins.
        """
        from urls.models import ShortenedURL
        
        return QueryOptimizer.optimize_queryset(
            ShortenedURL.objects.filter(user_id=user_id),
            select_related=['user'],
            prefetch_related=['clicks'],
            only=['id', 'original_url', 'short_code', 'title', 'is_active', 'created_at', 'user__username']
        )
    
    @staticmethod
    def get_optimized_analytics(user_id: int) -> QuerySet:
        """
        Get optimized queryset for user analytics.
        """
        from urls.models import URLClick
        
        return QueryOptimizer.optimize_queryset(
            URLClick.objects.filter(shortened_url__user_id=user_id),
            select_related=['shortened_url'],
            only=['id', 'clicked_at', 'ip_address', 'user_agent', 'referrer', 'shortened_url__short_code']
        )


class DatabaseMonitor:
    """
    Monitor database performance and provide insights.
    """
    
    @staticmethod
    def get_slow_queries(threshold: float = 0.1) -> List[Dict[str, Any]]:
        """
        Get queries that exceed the time threshold.
        
        Args:
            threshold: Time threshold in seconds
            
        Returns:
            List of slow queries
        """
        try:
            slow_queries = []
            
            # Check if queries logging is properly configured
            if not hasattr(connection, 'queries') or not isinstance(connection.queries, list):
                return slow_queries
            
            for query in connection.queries:
                time_taken = float(query.get('time', 0))
                if time_taken > threshold:
                    slow_queries.append({
                        'sql': query.get('sql', ''),
                        'time': time_taken,
                        'raw_sql': query.get('raw_sql', ''),
                    })
            
            return slow_queries
            
        except Exception as e:
            logger.error(f"Error getting slow queries: {e}")
            return []
    
    @staticmethod
    def get_query_statistics() -> Dict[str, Any]:
        """
        Get comprehensive query statistics.
        
        Returns:
            Dictionary with query statistics
        """
        try:
            # Check if queries logging is properly configured
            if not hasattr(connection, 'queries') or not isinstance(connection.queries, list):
                return {
                    'total_queries': 0,
                    'total_time': 0,
                    'avg_time': 0,
                    'max_time': 0,
                    'min_time': 0,
                }
            
            queries = connection.queries
            query_times = [float(q.get('time', 0)) for q in queries]
            
            if not query_times:
                return {
                    'total_queries': 0,
                    'total_time': 0,
                    'avg_time': 0,
                    'max_time': 0,
                    'min_time': 0,
                }
            
            return {
                'total_queries': len(queries),
                'total_time': sum(query_times),
                'avg_time': sum(query_times) / len(query_times),
                'max_time': max(query_times),
                'min_time': min(query_times),
                'slow_queries_count': len([t for t in query_times if t > 0.1]),
            }
            
        except Exception as e:
            logger.error(f"Error getting query statistics: {e}")
            return {}
    
    @staticmethod
    def analyze_query_patterns() -> Dict[str, Any]:
        """
        Analyze query patterns to identify optimization opportunities.
        
        Returns:
            Dictionary with analysis results
        """
        try:
            # Check if queries logging is properly configured
            if not hasattr(connection, 'queries') or not isinstance(connection.queries, list):
                return {}
            
            queries = connection.queries
            patterns = {}
            
            for query in queries:
                sql = query.get('sql', '')
                time_taken = float(query.get('time', 0))
                
                # Extract table name from SQL
                table_name = QueryAnalyzer.extract_table_name(sql)
                if table_name:
                    if table_name not in patterns:
                        patterns[table_name] = {
                            'count': 0,
                            'total_time': 0,
                            'avg_time': 0,
                            'max_time': 0,
                        }
                    
                    patterns[table_name]['count'] += 1
                    patterns[table_name]['total_time'] += time_taken
                    patterns[table_name]['max_time'] = max(
                        patterns[table_name]['max_time'], 
                        time_taken
                    )
            
            # Calculate averages
            for table_data in patterns.values():
                table_data['avg_time'] = table_data['total_time'] / table_data['count']
            
            return patterns
            
        except Exception as e:
            logger.error(f"Error analyzing query patterns: {e}")
            return {}


class QueryAnalyzer:
    """
    Analyze SQL queries for optimization opportunities.
    """
    
    @staticmethod
    def extract_table_name(sql: str) -> Optional[str]:
        """
        Extract table name from SQL query.
        
        Args:
            sql: SQL query string
            
        Returns:
            Table name or None
        """
        try:
            sql_lower = sql.lower()
            
            # Look for FROM clause
            if 'from' in sql_lower:
                parts = sql_lower.split('from')
                if len(parts) > 1:
                    table_part = parts[1].strip().split()[0]
                    # Remove quotes and schema prefixes
                    table_name = table_part.strip('"\'`').split('.')[-1]
                    return table_name
            
            # Look for JOIN clauses
            if 'join' in sql_lower:
                parts = sql_lower.split('join')
                if len(parts) > 1:
                    table_part = parts[1].strip().split()[0]
                    table_name = table_part.strip('"\'`').split('.')[-1]
                    return table_name
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting table name: {e}")
            return None
    
    @staticmethod
    def get_optimization_suggestions(sql: str) -> List[str]:
        """
        Get optimization suggestions for a SQL query.
        
        Args:
            sql: SQL query string
            
        Returns:
            List of optimization suggestions
        """
        suggestions = []
        sql_lower = sql.lower()
        
        try:
            # Check for SELECT *
            if 'select *' in sql_lower:
                suggestions.append("Use specific column names instead of SELECT *")
            
            # Check for missing WHERE clause
            if 'select' in sql_lower and 'where' not in sql_lower:
                suggestions.append("Consider adding WHERE clause to limit results")
            
            # Check for ORDER BY without LIMIT
            if 'order by' in sql_lower and 'limit' not in sql_lower:
                suggestions.append("Consider adding LIMIT clause with ORDER BY")
            
            # Check for potential N+1 queries
            if sql_lower.count('select') > 1:
                suggestions.append("Consider using JOINs or prefetch_related to avoid N+1 queries")
            
            # Check for LIKE queries
            if 'like' in sql_lower and '%' in sql:
                suggestions.append("Consider using database indexes for LIKE queries")
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Error getting optimization suggestions: {e}")
            return []


class ConnectionPool:
    """
    Manage database connections for optimal performance.
    """
    
    @staticmethod
    def get_connection_info() -> Dict[str, Any]:
        """
        Get information about database connections.
        
        Returns:
            Dictionary with connection information
        """
        try:
            db_settings = connection.settings_dict
            
            return {
                'engine': db_settings.get('ENGINE', ''),
                'name': db_settings.get('NAME', ''),
                'host': db_settings.get('HOST', ''),
                'port': db_settings.get('PORT', ''),
                'max_connections': db_settings.get('CONN_MAX_AGE', 0),
                'isolation_level': db_settings.get('OPTIONS', {}).get('isolation_level', ''),
            }
            
        except Exception as e:
            logger.error(f"Error getting connection info: {e}")
            return {}
    
    @staticmethod
    def optimize_connection_settings() -> Dict[str, Any]:
        """
        Get recommendations for database connection optimization.
        
        Returns:
            Dictionary with optimization recommendations
        """
        recommendations = []
        
        try:
            db_settings = connection.settings_dict
            
            # Check connection pooling
            if db_settings.get('CONN_MAX_AGE', 0) == 0:
                recommendations.append({
                    'category': 'connection',
                    'priority': 'medium',
                    'title': 'Enable Connection Pooling',
                    'description': 'CONN_MAX_AGE is set to 0, which disables connection pooling.',
                    'action': 'Set CONN_MAX_AGE to a reasonable value (e.g., 600 seconds).'
                })
            
            # Check for SSL
            if not db_settings.get('OPTIONS', {}).get('sslmode'):
                recommendations.append({
                    'category': 'security',
                    'priority': 'low',
                    'title': 'Enable SSL for Database',
                    'description': 'SSL is not enabled for database connections.',
                    'action': 'Add sslmode=require to database OPTIONS.'
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting connection optimization recommendations: {e}")
            return []


class IndexOptimizer:
    """
    Provide recommendations for database indexes.
    """
    
    @staticmethod
    def get_index_recommendations() -> List[Dict[str, Any]]:
        """
        Get recommendations for database indexes based on query patterns.
        
        Returns:
            List of index recommendations
        """
        recommendations = []
        
        try:
            # Analyze query patterns
            patterns = DatabaseMonitor.analyze_query_patterns()
            
            for table_name, data in patterns.items():
                if data['count'] > 10:  # Only recommend for frequently accessed tables
                    recommendations.append({
                        'table': table_name,
                        'priority': 'high' if data['avg_time'] > 0.1 else 'medium',
                        'reason': f"Table accessed {data['count']} times with avg time {data['avg_time']:.3f}s",
                        'suggestion': f"Consider adding indexes on frequently queried columns in {table_name}",
                    })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting index recommendations: {e}")
            return []


# Convenience functions
def optimize_user_queries(user_id: int) -> QuerySet:
    """Optimize queries for user data."""
    return QueryOptimizer.get_optimized_user_urls(user_id)


def get_performance_metrics() -> Dict[str, Any]:
    """Get comprehensive database performance metrics."""
    return {
        'statistics': DatabaseMonitor.get_query_statistics(),
        'patterns': DatabaseMonitor.analyze_query_patterns(),
        'slow_queries': DatabaseMonitor.get_slow_queries(),
        'connection_info': ConnectionPool.get_connection_info(),
        'index_recommendations': IndexOptimizer.get_index_recommendations(),
        'connection_recommendations': ConnectionPool.optimize_connection_settings(),
    }


def clear_query_log() -> None:
    """Clear the query log."""
    try:
        # Check if queries logging is properly configured
        if hasattr(connection, 'queries') and isinstance(connection.queries, list):
            connection.queries.clear()
            logger.info("Query log cleared")
        else:
            logger.warning("Query logging not properly configured")
    except Exception as e:
        logger.error(f"Error clearing query log: {e}")
