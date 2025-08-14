# SaaS URL - Authentication API Documentation

## Overview
This document describes the authentication API endpoints for the SaaS URL application, including JWT authentication, email verification, and password reset functionality.

## Base URL
```
http://localhost:8000/api/users/
```

## Authentication Endpoints

### 1. User Registration
**POST** `/register/`

Register a new user account.

**Request Body:**
```json
{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securepassword123",
    "password2": "securepassword123",
    "first_name": "John",
    "last_name": "Doe"
}
```

**Response (201 Created):**
```json
{
    "message": "User registered successfully. Please check your email to verify your account.",
    "user": {
        "id": 1,
        "username": "johndoe",
        "email": "john@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "role": "user",
        "is_verified": false,
        "date_joined": "2024-01-01T12:00:00Z"
    },
    "tokens": {
        "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
        "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
    }
}
```

**Notes:**
- Email verification link is automatically sent to the user's email
- User is created with `is_verified: false` until email is verified
- JWT tokens are provided for immediate access

### 2. User Login
**POST** `/login/`

Authenticate user and receive JWT tokens.

**Request Body:**
```json
{
    "email": "john@example.com",
    "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
    "message": "Login successful",
    "user": {
        "id": 1,
        "username": "johndoe",
        "email": "john@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "role": "user",
        "is_verified": true,
        "date_joined": "2024-01-01T12:00:00Z",
        "last_login": "2024-01-01T12:30:00Z"
    },
    "tokens": {
        "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
        "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
    }
}
```

### 3. User Logout
**POST** `/logout/`

Logout user and blacklist refresh token.

**Request Body:**
```json
{
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Response (200 OK):**
```json
{
    "message": "Logout successful"
}
```

## Email Verification Endpoints

### 4. Email Verification
**GET** `/verify-email/{token}/`

Verify user's email address using the token sent via email.

**Response:**
- **Success:** Redirects to `{FRONTEND_URL}/login?verified=true`
- **Expired Token:** Redirects to `{FRONTEND_URL}/login?verified=false&error=expired`
- **Invalid Token:** Redirects to `{FRONTEND_URL}/login?verified=false&error=invalid`

### 5. Resend Email Verification
**POST** `/resend-verification/`

Resend email verification link.

**Request Body:**
```json
{
    "email": "john@example.com"
}
```

**Response (200 OK):**
```json
{
    "message": "Verification email sent successfully"
}
```

**Response (400 Bad Request):**
```json
{
    "message": "Email is already verified"
}
```

## Password Reset Endpoints

### 6. Request Password Reset
**POST** `/password-reset/`

Request a password reset link to be sent via email.

**Request Body:**
```json
{
    "email": "john@example.com"
}
```

**Response (200 OK):**
```json
{
    "message": "Password reset email sent successfully"
}
```

### 7. Verify Password Reset Token
**GET** `/password-reset/{token}/`

Verify if a password reset token is valid.

**Response (200 OK):**
```json
{
    "valid": true,
    "email": "john@example.com"
}
```

**Response (400 Bad Request):**
```json
{
    "valid": false,
    "message": "Token expired or invalid"
}
```

### 8. Confirm Password Reset
**POST** `/password-reset/{token}/`

Set new password using the reset token.

**Request Body:**
```json
{
    "new_password": "newsecurepassword123",
    "new_password2": "newsecurepassword123"
}
```

**Response (200 OK):**
```json
{
    "message": "Password reset successfully"
}
```

## User Profile Endpoints

### 9. Get User Profile
**GET** `/profile/`

Get current user's profile information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "bio": "Software developer",
    "birth_date": "1990-01-01",
    "profile_picture": null,
    "role": "user",
    "is_verified": true,
    "is_premium": false,
    "date_joined": "2024-01-01T12:00:00Z",
    "last_login": "2024-01-01T12:30:00Z"
}
```

### 10. Update User Profile
**PUT/PATCH** `/profile/`

Update current user's profile information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
    "first_name": "John",
    "last_name": "Smith",
    "bio": "Updated bio"
}
```

### 11. Change Password
**POST** `/change-password/`

Change user's password (requires authentication).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
    "old_password": "currentpassword",
    "new_password": "newpassword123",
    "new_password2": "newpassword123"
}
```

**Response (200 OK):**
```json
{
    "message": "Password changed successfully"
}
```

## Admin Endpoints

### 12. Admin Dashboard
**GET** `/admin/dashboard/`

Get admin dashboard statistics (admin access required).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
    "stats": {
        "total_users": 150,
        "active_users": 120,
        "new_users_today": 5,
        "new_users_week": 25,
        "role_distribution": [
            {"role": "user", "count": 140},
            {"role": "admin", "count": 10}
        ]
    },
    "recent_users": [...]
}
```

### 13. List All Users (Admin)
**GET** `/admin/users/`

Get list of all users (admin access required).

**Query Parameters:**
- `search`: Search by username, email, first_name, or last_name
- `role`: Filter by role (admin/user)
- `is_active`: Filter by active status (true/false)

### 14. User Detail (Admin)
**GET/PUT/PATCH** `/admin/users/{id}/`

Get or update specific user details (admin access required).

## JWT Token Usage

### Access Token
- **Lifetime:** 60 minutes
- **Usage:** Include in Authorization header for protected endpoints
- **Format:** `Authorization: Bearer <access_token>`

### Refresh Token
- **Lifetime:** 24 hours
- **Usage:** Get new access token when current one expires
- **Endpoint:** Use Django REST framework's built-in refresh endpoint

## Email Templates

The application uses custom HTML email templates for:
1. **Email Verification:** Beautiful template with verification button
2. **Password Reset:** Secure template with reset button

Both templates include:
- Modern, responsive design
- Clear call-to-action buttons
- Security notices and expiry information
- Fallback text links

## Security Features

1. **JWT Authentication:** Secure token-based authentication
2. **Email Verification:** Required for account activation
3. **Password Reset:** Secure token-based password reset
4. **Token Expiry:** Email verification (24 hours), password reset (1 hour)
5. **CORS Protection:** Configured for frontend integration
6. **Password Validation:** Django's built-in password validators

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200 OK`: Success
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Environment Variables

Required environment variables:
```env
# Email Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@saasurl.com

# Frontend URL for redirects
FRONTEND_URL=http://localhost:3000
```

## Frontend Integration

### Email Verification Flow
1. User registers → receives verification email
2. User clicks link → backend verifies → redirects to frontend
3. Frontend shows success/error message based on URL parameters

### Password Reset Flow
1. User requests reset → receives reset email
2. User clicks link → frontend validates token → shows reset form
3. User submits new password → backend updates → redirects to login

### URL Parameters for Frontend
- `?verified=true`: Email verification successful
- `?verified=false&error=expired`: Verification token expired
- `?verified=false&error=invalid`: Invalid verification token
