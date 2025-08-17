"""
WSGI config for saas_url project.

This configuration is optimized for production deployment with multiple workers.
"""

import os
import sys
from pathlib import Path

# Add the project directory to Python path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_url.settings')

# Import Django after setting the environment
from django.core.wsgi import get_wsgi_application

# Get the WSGI application
application = get_wsgi_application()

# Production optimizations
if os.environ.get('DJANGO_ENV') == 'production':
    # Enable production optimizations
    os.environ['DJANGO_SETTINGS_MODULE'] = 'saas_url.settings'
    
    # Set production environment variables
    os.environ.setdefault('DJANGO_ENV', 'production')
    os.environ.setdefault('DJANGO_DEBUG', 'False')
    
    # Import and configure production middleware
    try:
        from saas_url.performance_middleware import PerformanceMiddleware
        from saas_url.rate_limiting import RateLimitingMiddleware
        from saas_url.security_middleware import SecurityHeadersMiddleware
        
        # Wrap application with production middleware
        application = PerformanceMiddleware(application)
        application = RateLimitingMiddleware(application)
        application = SecurityHeadersMiddleware(application)
        
    except ImportError as e:
        # Log warning if middleware not available
        import logging
        logging.warning(f"Production middleware not available: {e}")
