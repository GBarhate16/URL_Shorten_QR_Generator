import logging
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from django.shortcuts import redirect
from django.conf import settings
from .models import CustomUser
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserProfileSerializer,
    AdminUserSerializer, ChangePasswordSerializer, EmailVerificationSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer, ResendVerificationSerializer
)
from .email_service import EmailService

logger = logging.getLogger(__name__)

class UserRegistrationView(APIView):
    """User registration view"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Generate email verification token and send email
            token = user.generate_email_verification_token()
            verification_url = f"{settings.FRONTEND_URL}/verify-email/{token}"
            
            # Send verification email
            EmailService.send_email_verification(user, verification_url)
            
            refresh = RefreshToken.for_user(user)
            return Response({
                'message': 'User registered successfully. Please check your email to verify your account.',
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def options(self, request):
        response = Response()
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, PUT, PATCH, DELETE"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response

class UserLoginView(APIView):
    """User login view"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            
            # Update last login
            user.last_login = timezone.now()
            user.save()
            
            return Response({
                'message': 'Login successful',
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                }
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def options(self, request):
        response = Response()
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, PUT, PATCH, DELETE"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response

class UserProfileView(generics.RetrieveUpdateAPIView):
    """User profile view"""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user

class ChangePasswordView(APIView):
    """Change password view"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AdminDashboardView(APIView):
    """Admin dashboard view with user statistics"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if not request.user.can_access_admin_dashboard():
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get user statistics
        total_users = CustomUser.objects.count()
        active_users = CustomUser.objects.filter(is_active=True).count()
        new_users_today = CustomUser.objects.filter(
            date_joined__date=timezone.now().date()
        ).count()
        new_users_week = CustomUser.objects.filter(
            date_joined__gte=timezone.now() - timedelta(days=7)
        ).count()
        
        # Get role distribution
        role_stats = CustomUser.objects.values('role').annotate(count=Count('id'))
        
        # Get recent users
        recent_users = CustomUser.objects.order_by('-date_joined')[:10]
        
        # Get password reset statistics (last 7 days)
        from datetime import datetime, timedelta
        week_ago = timezone.now() - timedelta(days=7)
        
        # Count users who requested password reset in last 7 days
        password_reset_requests = CustomUser.objects.filter(
            password_reset_sent_at__gte=week_ago
        ).count()
        
        # Count users who completed password reset in last 7 days
        password_reset_completed = CustomUser.objects.filter(
            password_reset_sent_at__gte=week_ago,
            password_reset_token__isnull=True  # Token cleared after successful reset
        ).count()
        
        return Response({
            'stats': {
                'total_users': total_users,
                'active_users': active_users,
                'new_users_today': new_users_today,
                'new_users_week': new_users_week,
                'role_distribution': role_stats,
                'password_reset_requests_week': password_reset_requests,
                'password_reset_completed_week': password_reset_completed,
            },
            'recent_users': UserProfileSerializer(recent_users, many=True).data,
        })

class AdminUserListView(generics.ListAPIView):
    """Admin view for listing all users"""
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if not self.request.user.can_access_admin_dashboard():
            return CustomUser.objects.none()
        
        queryset = CustomUser.objects.all()
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        # Filter by role
        role = self.request.query_params.get('role', None)
        if role:
            queryset = queryset.filter(role=role)
        
        # Filter by status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset.order_by('-date_joined')

class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """Admin view for user detail and management"""
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = CustomUser.objects.all()
    
    def get(self, request, *args, **kwargs):
        if not request.user.can_access_admin_dashboard():
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        return super().get(request, *args, **kwargs)
    
    def put(self, request, *args, **kwargs):
        if not request.user.can_access_admin_dashboard():
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        return super().put(request, *args, **kwargs)
    
    def patch(self, request, *args, **kwargs):
        if not request.user.can_access_admin_dashboard():
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        return super().patch(request, *args, **kwargs)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """Logout view to blacklist refresh token"""
    try:
        refresh_token = request.data.get('refresh_token')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
    except Exception:
        return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)

class EmailVerificationView(APIView):
    """Email verification view"""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, token):
        """Verify email with token"""
        try:
            # Find user with this token
            user = CustomUser.objects.get(email_verification_token=token)
            
            if user.verify_email_token(token):
                # Redirect to frontend with success message
                return redirect(f"{settings.FRONTEND_URL}/login?verified=true")
            else:
                # Redirect to frontend with error message
                return redirect(f"{settings.FRONTEND_URL}/login?verified=false&error=expired")
                
        except CustomUser.DoesNotExist:
            # Redirect to frontend with error message
            return redirect(f"{settings.FRONTEND_URL}/login?verified=false&error=invalid")

class ResendVerificationView(APIView):
    """Resend email verification view"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            try:
                user = CustomUser.objects.get(email=email)
                
                if user.is_verified:
                    return Response({
                        'message': 'Email is already verified'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Generate new token and send email
                token = user.generate_email_verification_token()
                verification_url = f"{settings.FRONTEND_URL}/verify-email/{token}"
                
                if EmailService.send_email_verification(user, verification_url):
                    return Response({
                        'message': 'Verification email sent successfully'
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        'message': 'Failed to send verification email'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
            except CustomUser.DoesNotExist:
                return Response({
                    'message': 'User with this email does not exist'
                }, status=status.HTTP_404_NOT_FOUND)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetRequestView(APIView):
    """Password reset request view"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            
            # Log password reset attempt for security monitoring
            client_ip = self.get_client_ip(request)
            logger.info(f"Password reset requested for email: {email} from IP: {client_ip}")
            
            try:
                user = CustomUser.objects.get(email=email)
                
                # Generate password reset token and send email
                token = user.generate_password_reset_token()
                reset_url = f"{settings.FRONTEND_URL}/reset-password/{token}"
                
                if EmailService.send_password_reset(user, reset_url):
                    logger.info(f"Password reset email sent successfully to: {email}")
                else:
                    logger.error(f"Failed to send password reset email to: {email}")

                # For security and UX, always return a generic success message regardless of email send outcome
                return Response({
                    'message': 'If an account with this email exists, a password reset link has been sent'
                }, status=status.HTTP_200_OK)
                    
            except CustomUser.DoesNotExist:
                # Don't reveal if user exists or not for security
                logger.warning(f"Password reset attempted for non-existent email: {email} from IP: {client_ip}")
                return Response({
                    'message': 'If an account with this email exists, a password reset link has been sent'
                }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get_client_ip(self, request):
        """Get client IP address for security logging"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class PasswordResetConfirmView(APIView):
    """Password reset confirmation view"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, token):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            try:
                # Find user with this token
                user = CustomUser.objects.get(password_reset_token=token)
                
                if user.verify_password_reset_token(token):
                    # Set new password
                    user.set_password(serializer.validated_data['new_password'])
                    user.clear_password_reset_token()
                    user.save()
                    
                    # Log successful password reset
                    client_ip = self.get_client_ip(request)
                    logger.info(f"Password reset completed successfully for user: {user.email} from IP: {client_ip}")
                    
                    return Response({
                        'message': 'Password reset successfully'
                    }, status=status.HTTP_200_OK)
                else:
                    logger.warning(f"Invalid/expired password reset token attempted: {token[:10]}...")
                    return Response({
                        'message': 'Invalid or expired reset token'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except CustomUser.DoesNotExist:
                logger.warning(f"Password reset attempted with non-existent token: {token[:10]}...")
                return Response({
                    'message': 'Invalid reset token'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get_client_ip(self, request):
        """Get client IP address for security logging"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def get(self, request, token):
        """Verify reset token validity"""
        try:
            user = CustomUser.objects.get(password_reset_token=token)
            if user.verify_password_reset_token(token):
                return Response({
                    'valid': True,
                    'email': user.email
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'valid': False,
                    'message': 'Token expired or invalid'
                }, status=status.HTTP_400_BAD_REQUEST)
        except CustomUser.DoesNotExist:
            return Response({
                'valid': False,
                'message': 'Invalid token'
            }, status=status.HTTP_400_BAD_REQUEST)
