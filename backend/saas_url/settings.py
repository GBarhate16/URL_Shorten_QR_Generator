"""
Django settings for saas_url project.
"""

import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
try:
    import environ
    env = environ.Env()
    environ.Env.read_env(os.path.join(BASE_DIR, '.env'))
except ImportError:
    # Fallback if django-environ is not available
    env = type('Env', (), {
        '__call__': lambda self, key, default=None: os.environ.get(key, default),
        'bool': lambda self, key, default=False: os.environ.get(key, str(default)).lower() == 'true',
        'list': lambda self, key, default=None: os.environ.get(key, str(default)).split(',') if os.environ.get(key) else default or []
    })()

# Database URL configuration
try:
    import dj_database_url
    DATABASE_URL = 'postgresql://neondb_owner:npg_T3HtbvW7qnjl@ep-still-cake-adnvtjiv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
except ImportError:
    dj_database_url = None
    DATABASE_URL = None

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env('SECRET_KEY', default='django-insecure-change-this-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env.bool('DEBUG', default=True)

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1', '.onrender.com'])

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'channels',
    
    # Local apps
    'urls',
    'users',
    'qr_codes',
]

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

ROOT_URLCONF = 'saas_url.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            BASE_DIR / 'templates',
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'saas_url.wsgi.application'
ASGI_APPLICATION = 'saas_url.asgi.application'

# Cache / Redis configuration
# By default disable external Redis to simplify local/dev: use a no-op cache.
# Can be re-enabled by setting CACHE_BACKEND=django_redis.cache.RedisCache and REDIS_URL.
REDIS_URL = env('REDIS_URL', default='')
CACHE_BACKEND = env('CACHE_BACKEND', default='django.core.cache.backends.dummy.DummyCache')

if CACHE_BACKEND == 'django_redis.cache.RedisCache' and REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'IGNORE_EXCEPTIONS': True,
            }
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': CACHE_BACKEND,
        }
    }

# Channels configuration
# Default to in‑memory channel layer (single‑process), avoiding Redis dependency.
CHANNEL_LAYER_BACKEND = env('CHANNEL_LAYER_BACKEND', default='channels.layers.InMemoryChannelLayer')
CHANNEL_LAYER_URL = env('CHANNEL_LAYER_URL', default='')
if CHANNEL_LAYER_BACKEND == 'channels_redis.core.RedisChannelLayer' and CHANNEL_LAYER_URL:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [CHANNEL_LAYER_URL],
            },
        },
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        }
    }

# Database
if DATABASE_URL and dj_database_url:
    # Use DATABASE_URL for production (Render/Neon)
    DATABASES = {
        'default': dj_database_url.config(default=DATABASE_URL)
    }
else:
    # Check if PostgreSQL environment variables are set
    db_host = env('DB_HOST', default='')
    db_name = env('DB_NAME', default='')
    db_user = env('DB_USER', default='')
    db_password = env('DB_PASSWORD', default='')
    
    # If PostgreSQL credentials are provided, use PostgreSQL
    if db_host and db_name and db_user:
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': db_name,
                'USER': db_user,
                'PASSWORD': db_password,
                'HOST': db_host,
                'PORT': env('DB_PORT', default='5432'),
            }
        }
    else:
        # Fallback to SQLite for local development
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
            }
        }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = env('STATIC_URL', default='/static/')
STATIC_ROOT = os.path.join(BASE_DIR, env('STATIC_ROOT', default='staticfiles'))
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

# Media files
MEDIA_URL = env('MEDIA_URL', default='/media/')
MEDIA_ROOT = os.path.join(BASE_DIR, env('MEDIA_ROOT', default='media'))

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS settings
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    'http://localhost:3000',
    'http://127.0.0.1:3000',
])
CORS_ALLOW_CREDENTIALS = env.bool('CORS_ALLOW_CREDENTIALS', default=True)

# Additional CORS settings to handle preflight requests
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# CSRF trusted origins (must be scheme + host only, no trailing slash)
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[
    'http://localhost:3000',
    'http://127.0.0.1:3000',
])

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
}

# JWT Settings
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=7),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': False,

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,

    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',

    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',

    'JTI_CLAIM': 'jti',

    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=5),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=7),
}

# Custom user model
AUTH_USER_MODEL = 'users.CustomUser'

# Email Configuration
EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='noreply@saasurl.com')

# Resend API (HTTP) fallback
RESEND_API_KEY = env('RESEND_API_KEY', default='')

# Frontend URL for redirects
FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:3000')
# Backend base URL (used for absolute redirect links in QR)
BACKEND_URL = env('BACKEND_URL', default='http://127.0.0.1:8000')

# Cloudinary settings
CLOUDINARY_CLOUD_NAME = env('CLOUDINARY_CLOUD_NAME', default='')
CLOUDINARY_API_KEY = env('CLOUDINARY_API_KEY', default='')
CLOUDINARY_API_SECRET = env('CLOUDINARY_API_SECRET', default='')

# Cache configuration
CACHE_RULES = {
    # URL patterns that should be cached automatically
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
}

# Cache logging configuration
CACHE_LOGGING = env.bool('CACHE_LOGGING', default=False)

# Performance optimization settings
ENABLE_GZIP = env.bool('ENABLE_GZIP', default=True)
ENABLE_CACHE_HEADERS = env.bool('ENABLE_CACHE_HEADERS', default=True)
ENABLE_QUERY_MONITORING = env.bool('ENABLE_QUERY_MONITORING', default=True)
ENABLE_QUERY_OPTIMIZATION = env.bool('ENABLE_QUERY_OPTIMIZATION', default=True)
MIN_RESPONSE_SIZE_FOR_GZIP = env.int('MIN_RESPONSE_SIZE_FOR_GZIP', default=500)

# Cache duration settings (in seconds)
CACHE_DURATIONS = {
    'static': 31536000,  # 1 year
    'api': 300,          # 5 minutes
    'html': 600,         # 10 minutes
    'json': 300,         # 5 minutes
}

# Database optimization settings
DB_OPTIMIZATION = {
    'enable_query_logging': env.bool('DB_ENABLE_QUERY_LOGGING', default=False),
    'slow_query_threshold': env.float('DB_SLOW_QUERY_THRESHOLD', default=0.1),
    'max_query_count_warning': env.int('DB_MAX_QUERY_COUNT_WARNING', default=20),
}

# Performance monitoring settings
PERFORMANCE_MONITORING = {
    'enable_metrics_collection': env.bool('PERF_ENABLE_METRICS', default=True),
    'metrics_retention_hours': env.int('PERF_METRICS_RETENTION', default=24),
    'slow_request_threshold': env.float('PERF_SLOW_REQUEST_THRESHOLD', default=1.0),
    'high_query_threshold': env.int('PERF_HIGH_QUERY_THRESHOLD', default=10),
}