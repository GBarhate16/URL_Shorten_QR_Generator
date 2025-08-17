"""
Production settings for saas_url project.
This file contains minimal settings for production deployment.
"""

import os
from pathlib import Path
from .settings import *

# Override settings for production
DEBUG = False
ALLOWED_HOSTS = ['*']  # Configure this properly for production

# Disable problematic middleware for production
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Security settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Disable security headers middleware
ENABLE_SECURITY_HEADERS = False

# Simplified cache configuration
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# Use database for sessions instead of Redis
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
