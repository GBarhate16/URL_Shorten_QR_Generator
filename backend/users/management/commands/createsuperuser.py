from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()

class Command(BaseCommand):
    help = 'Create a superuser with admin role'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, required=True)
        parser.add_argument('--email', type=str, required=True)
        parser.add_argument('--password', type=str, required=True)
        parser.add_argument('--first-name', type=str, default='')
        parser.add_argument('--last-name', type=str, default='')

    def handle(self, *args, **options):
        username = options['username']
        email = options['email']
        password = options['password']
        first_name = options['first_name']
        last_name = options['last_name']

        try:
            with transaction.atomic():
                # Check if user already exists
                if User.objects.filter(username=username).exists():
                    self.stdout.write(
                        self.style.WARNING(f'User "{username}" already exists')
                    )
                    return

                if User.objects.filter(email=email).exists():
                    self.stdout.write(
                        self.style.WARNING(f'Email "{email}" already exists')
                    )
                    return

                # Create superuser
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    role='admin',
                    is_staff=True,
                    is_superuser=True,
                    is_active=True,
                    is_verified=True,
                    can_manage_users=True,
                    can_view_analytics=True,
                )

                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully created superuser "{username}" with admin role'
                    )
                )
                self.stdout.write(f'Username: {username}')
                self.stdout.write(f'Email: {email}')
                self.stdout.write(f'Role: {user.get_role_display()}')
                self.stdout.write(f'Is Superuser: {user.is_superuser}')
                self.stdout.write(f'Can Manage Users: {user.can_manage_users}')
                self.stdout.write(f'Can View Analytics: {user.can_view_analytics}')

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating superuser: {str(e)}')
            )
