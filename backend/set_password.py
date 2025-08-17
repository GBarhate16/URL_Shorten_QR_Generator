#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_url.settings')
django.setup()

from users.models import CustomUser

# Set admin password
try:
    admin_user = CustomUser.objects.get(username='admin')
    admin_user.set_password('admin')
    admin_user.save()
    print(f"Password for user '{admin_user.username}' has been set to 'admin'")
except CustomUser.DoesNotExist:
    print("Admin user not found")
except Exception as e:
    print(f"Error: {e}")
