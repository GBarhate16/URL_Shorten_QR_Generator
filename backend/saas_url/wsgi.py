"""
WSGI config for saas_url project.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_url.settings')

application = get_wsgi_application()
