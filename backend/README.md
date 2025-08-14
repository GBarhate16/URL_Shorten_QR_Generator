# URL Shortener SaaS - Backend

A Django-based backend for a URL shortening service with JWT authentication, user roles, and custom admin interface.

## Features

- **JWT Authentication**: Secure token-based authentication using `djangorestframework-simplejwt`
- **User Management**: Custom user model with roles (admin, user) and premium features
- **Custom Admin Interface**: Beautiful, modern Django admin with custom templates
- **API Endpoints**: RESTful API for user management, URL shortening, and analytics
- **Role-Based Access Control**: Different permissions for admin and regular users
- **PostgreSQL Database**: Production-ready database with proper indexing

## Prerequisites

- Python 3.8+
- PostgreSQL 12+
- pip (Python package manager)

## Installation

1. **Clone the repository and navigate to backend:**
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment:**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env with your database credentials and secret key
   # Make sure to set a strong SECRET_KEY
   ```

5. **Set up PostgreSQL database:**
   ```bash
   # Create database
   createdb url_shortener
   
   # Or use psql
   psql -U postgres
   CREATE DATABASE url_shortener;
   \q
   ```

6. **Run migrations:**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

7. **Create a superuser with admin role:**
   ```bash
   python manage.py createsuperuser --username admin --email admin@example.com --password your_password --first-name Admin --last-name User
   ```

8. **Run the development server:**
   ```bash
   python manage.py runserver
   ```

## JWT Authentication Setup

The backend uses JWT (JSON Web Tokens) for authentication. Key features:

- **Access Token**: Short-lived (60 minutes) for API requests
- **Refresh Token**: Long-lived (24 hours) for getting new access tokens
- **Token Blacklisting**: Secure logout by blacklisting refresh tokens

### JWT Configuration

JWT settings are configured in `settings.py`:

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}
```

## User Roles and Permissions

### Admin Users
- Full access to all features
- Can manage other users
- Access to admin dashboard
- Can view analytics and statistics

### Regular Users
- Create and manage their own URLs
- Basic analytics for their URLs
- Profile management

## Custom Admin Interface

The backend includes a custom Django admin interface with:

- **Modern Design**: Clean, responsive interface with custom CSS
- **Dashboard Statistics**: User counts, URL statistics, and recent activity
- **Quick Actions**: Easy access to common admin tasks
- **Custom Templates**: Located in `templates/admin/`

### Accessing Admin

1. **Django Admin**: Visit `/admin/` after creating a superuser
2. **Custom Dashboard**: Beautiful statistics and quick actions
3. **User Management**: Manage users, roles, and permissions

## API Endpoints

### Authentication
- `POST /api/users/register/` - User registration
- `POST /api/users/login/` - User login (returns JWT tokens)
- `POST /api/users/logout/` - User logout (blacklists refresh token)

### User Management
- `GET /api/users/profile/` - Get user profile
- `PUT /api/users/profile/` - Update user profile
- `POST /api/users/change-password/` - Change password

### Admin Endpoints
- `GET /api/users/admin/dashboard/` - Admin dashboard statistics
- `GET /api/users/admin/users/` - List all users (admin only)
- `GET /api/users/admin/users/{id}/` - Get user details (admin only)

### URL Management
- `GET /api/urls/` - List user's URLs
- `POST /api/urls/` - Create new short URL
- `GET /api/urls/redirect/{short_code}/` - Redirect to original URL

## Database Models

### CustomUser
- Extended Django user model with additional fields
- Role-based permissions (admin/user)
- Premium features support
- API key for external integrations

### ShortenedURL
- URL shortening with custom short codes
- Click tracking and analytics
- Expiration dates and user ownership

### URLClick
- Detailed click analytics
- Timestamp and user agent tracking
- Geographic data (if available)

## Environment Variables

Create a `.env` file in the backend directory:

```env
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgres://user:password@localhost:5432/url_shortener
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## Development

### Running Tests
```bash
python manage.py test
```

### Creating Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### Shell Access
```bash
python manage.py shell
```

### Creating Management Commands
```bash
python manage.py createsuperuser --username admin --email admin@example.com --password password --first-name Admin --last-name User
```

## Production Deployment

1. **Set DEBUG=False** in production
2. **Use strong SECRET_KEY**
3. **Configure proper CORS settings**
4. **Set up HTTPS**
5. **Use production database**
6. **Configure static/media file serving**

## Security Features

- JWT token authentication
- CORS protection
- SQL injection protection
- XSS protection
- CSRF protection
- Role-based access control
- Secure password validation

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure PostgreSQL is running and credentials are correct
2. **Migration Errors**: Delete migrations folder and recreate if needed
3. **JWT Issues**: Check token expiration and blacklist settings
4. **CORS Errors**: Verify CORS settings match your frontend URL

### Logs

Check Django logs for detailed error information:
```bash
python manage.py runserver --verbosity=2
```

## Contributing

1. Follow PEP 8 style guidelines
2. Add tests for new features
3. Update documentation
4. Use meaningful commit messages

## License

This project is licensed under the MIT License.
