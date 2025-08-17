from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, Q
from django.http import HttpResponseRedirect, HttpResponse
from django.conf import settings
import logging
from datetime import timedelta
from collections import Counter

from .models import QRCode, QRCodeScan, QRCodeFile
from .serializers import (
    QRCodeSerializer, QRCodeCreateSerializer, QRCodeUpdateSerializer,
    QRCodeScanSerializer, QRCodeFileSerializer, QRCodeAnalyticsSerializer
)
from .utils import QRCodeGenerator, FileUploadHandler, AnalyticsHelper

logger = logging.getLogger(__name__)


class QRCodeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing QR codes
    """
    serializer_class = QRCodeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get QR codes for the current user"""
        return QRCode.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        """Use different serializer for different actions"""
        if self.action == 'create':
            return QRCodeCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return QRCodeUpdateSerializer
        return QRCodeSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new QR code with better error logging"""
        try:
            logger.info(f"Creating QR code for user {request.user.id}")
            logger.info(f"Request data: {request.data}")
            
            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                logger.error(f"Validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            qr_code = self.perform_create(serializer)
            logger.info(f"QR code created successfully: {qr_code.id}")
            
            response_serializer = QRCodeSerializer(qr_code)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating QR code: {e}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def perform_create(self, serializer):
        """Create QR code and generate image"""
        qr_code = serializer.save(user=self.request.user)
        
        # Handle file association if this is a file QR code
        if qr_code.qr_type == 'file' and qr_code.content.get('file_url'):
            self.associate_file_with_qr_code(qr_code)
        
        # Generate QR code image
        self.generate_qr_image(qr_code)
        
        return qr_code
    
    def perform_update(self, serializer):
        """Update QR code and regenerate image if needed"""
        qr_code = serializer.save()
        
        # Regenerate QR code image if content changed
        if 'content' in serializer.validated_data:
            self.generate_qr_image(qr_code)
        
        return qr_code
    
    def generate_qr_image(self, qr_code):
        """Generate QR code image and upload to Cloudinary"""
        try:
            # Get content to encode
            content = qr_code.get_qr_content()
            
            if not content:
                logger.error(f"No content to encode for QR code {qr_code.id}")
                return
            
            # Generate QR code image
            qr_image = QRCodeGenerator.generate_qr_code(
                content=content,
                customization=qr_code.customization
            )
            
            if not qr_image:
                logger.error(f"Failed to generate QR code image for {qr_code.id}")
                return
            
            # Upload to Cloudinary
            public_id = f"qr_{qr_code.short_code}" if qr_code.short_code else f"qr_{qr_code.id}"
            cloudinary_url = QRCodeGenerator.upload_to_cloudinary(qr_image, public_id)
            
            if cloudinary_url:
                qr_code.qr_image_url = cloudinary_url
                qr_code.save(update_fields=['qr_image_url'])
                logger.info(f"QR code image uploaded to Cloudinary: {cloudinary_url}")
            else:
                logger.error(f"Failed to upload QR code image to Cloudinary for {qr_code.id}")
            
        except Exception as e:
            logger.error(f"Error generating QR code image: {e}")
    
    def associate_file_with_qr_code(self, qr_code):
        """Associate uploaded file with QR code"""
        try:
            content = qr_code.content
            if not content.get('file_url'):
                return
            
            # Create QRCodeFile record
            QRCodeFile.objects.create(
                qr_code=qr_code,
                file_url=content['file_url'],
                file_name=content.get('file_name', ''),
                file_size=content.get('file_size', 0),
                file_type=content.get('file_type', 'application/octet-stream')
            )
            
            logger.info(f"File associated with QR code {qr_code.id}")
            
        except Exception as e:
            logger.error(f"Error associating file with QR code: {e}")
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download QR code image"""
        qr_code = self.get_object()
        
        if not qr_code.qr_image_url:
            return Response(
                {'error': 'QR code image not available'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            import requests
            response = requests.get(qr_code.qr_image_url)
            response.raise_for_status()
            
            # Create HTTP response with image
            http_response = HttpResponse(
                response.content, 
                content_type='image/png'
            )
            http_response['Content-Disposition'] = f'attachment; filename="qr_{qr_code.title}.png"'
            
            return http_response
            
        except Exception as e:
            logger.error(f"Error downloading QR code image: {e}")
            return Response(
                {'error': 'Failed to download QR code image'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get analytics for QR code"""
        qr_code = self.get_object()
        
        if not qr_code.is_dynamic:
            return Response(
                {'error': 'Analytics only available for dynamic QR codes'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get scan data
            scans = qr_code.scans.all()
            total_scans = scans.count()
            recent_scans = scans[:10]
            
            # Group scans by date
            scans_by_date = {}
            for scan in scans:
                date_str = scan.scanned_at.date().isoformat()
                scans_by_date[date_str] = scans_by_date.get(date_str, 0) + 1
            
            # Group scans by country
            scans_by_country = {}
            for scan in scans:
                country = scan.country or 'Unknown'
                scans_by_country[country] = scans_by_country.get(country, 0) + 1
            
            # Group scans by device
            scans_by_device = {}
            for scan in scans:
                device = scan.device_type or 'Unknown'
                scans_by_device[device] = scans_by_device.get(device, 0) + 1
            
            # Group scans by browser
            scans_by_browser = {}
            for scan in scans:
                browser = scan.browser or 'Unknown'
                scans_by_browser[browser] = scans_by_browser.get(browser, 0) + 1
            
            analytics_data = {
                'total_scans': total_scans,
                'recent_scans': QRCodeScanSerializer(recent_scans, many=True).data,
                'scans_by_date': scans_by_date,
                'scans_by_country': scans_by_country,
                'scans_by_device': scans_by_device,
                'scans_by_browser': scans_by_browser,
            }
            
            return Response(analytics_data)
            
        except Exception as e:
            logger.error(f"Error getting QR code analytics: {e}")
            return Response(
                {'error': 'Failed to get analytics'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """Toggle QR code status"""
        qr_code = self.get_object()
        
        if qr_code.status == 'active':
            qr_code.status = 'inactive'
        else:
            qr_code.status = 'active'
        
        qr_code.save()
        
        return Response({
            'id': qr_code.id,
            'status': qr_code.status,
            'status_display': qr_code.get_status_display()
        })


class QRCodeRedirectView(APIView):
    """
    View for handling dynamic QR code redirects
    """
    permission_classes = []
    
    def get(self, request, short_code):
        """Redirect to the actual content"""
        try:
            logger.info(f"QR code scan attempt for short_code: {short_code}")
            
            # Try to find dynamic QR code first
            qr_code = get_object_or_404(QRCode, short_code=short_code)
            logger.info(f"QR code found: {qr_code.id}, type: {qr_code.qr_type}, status: {qr_code.status}")
            
            # Check if QR code is active and not expired
            if qr_code.status != 'active':
                logger.warning(f"QR code {qr_code.id} is not active: {qr_code.status}")
                return Response(
                    {'error': 'This QR code is not active'}, 
                    status=status.HTTP_410_GONE
                )
            
            if qr_code.is_expired():
                logger.warning(f"QR code {qr_code.id} has expired")
                return Response(
                    {'error': 'This QR code has expired'}, 
                    status=status.HTTP_410_GONE
                )
            
            # Record scan for both dynamic and static QR codes
            self.record_scan(qr_code, request)
            logger.info(f"Scan recorded for QR code {qr_code.id}")
            
            # For dynamic QR codes, redirect to content
            if qr_code.is_dynamic:
                redirect_url = self.get_redirect_url(qr_code)
                logger.info(f"Dynamic QR code {qr_code.id} redirecting to: {redirect_url}")
                
                if not redirect_url:
                    logger.error(f"No redirect URL available for QR code {qr_code.id}")
                    return Response(
                        {'error': 'No content available'}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                # Redirect to content
                return HttpResponseRedirect(redirect_url)
            else:
                # For static QR codes, return the content directly
                content = qr_code.generate_static_content()
                logger.info(f"Static QR code {qr_code.id} content: {content[:100]}...")
                return Response({
                    'content': content,
                    'qr_type': qr_code.qr_type,
                    'title': qr_code.title
                })
            
        except QRCode.DoesNotExist:
            return Response(
                {'error': 'QR code not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def get_redirect_url(self, qr_code):
        """Get redirect URL based on QR code type"""
        content = qr_code.content
        
        if qr_code.qr_type == 'url':
            return content.get('url', '')
        
        elif qr_code.qr_type == 'file':
            return content.get('file_url', '')
        
        elif qr_code.qr_type == 'social':
            platform = content.get('platform', '')
            username = content.get('username', '')
            
            if platform == 'instagram':
                return f"https://instagram.com/{username}"
            elif platform == 'twitter':
                return f"https://twitter.com/{username}"
            elif platform == 'facebook':
                return f"https://facebook.com/{username}"
            elif platform == 'linkedin':
                return f"https://linkedin.com/in/{username}"
            else:
                return content.get('url', '')
        
        # For other types, return the static content
        return qr_code.generate_static_content()
    
    def record_scan(self, qr_code, request):
        """Record QR code scan with analytics"""
        try:
            # Get client IP
            ip_address = self.get_client_ip(request)
            
            # Get user agent
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            
            # Get referrer
            referrer = request.META.get('HTTP_REFERER', '')
            
            # Parse user agent for device info
            device_info = AnalyticsHelper.parse_user_agent(user_agent)
            
            # Get geolocation (simplified - you can implement more sophisticated geo detection)
            country = self.get_country_from_ip(ip_address)
            city = ''
            
            # Create scan record
            QRCodeScan.objects.create(
                qr_code=qr_code,
                ip_address=ip_address,
                user_agent=user_agent,
                referrer=referrer,
                country=country,
                city=city,
                device_type=device_info['device_type'],
                browser=device_info['browser'],
                os=device_info['os']
            )
            
        except Exception as e:
            logger.error(f"Error recording QR code scan: {e}")
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def get_country_from_ip(self, ip_address):
        """
        Attempt to get country from IP address using a free service.
        This is a simplified example and might not be accurate for all IPs.
        For production, consider using a paid service or a more robust library.
        
        Note: This uses ipapi.co which is free but has rate limits.
        For production use, consider services like MaxMind GeoIP2 or similar.
        """
        try:
            # Skip localhost and private IPs
            if ip_address in ['127.0.0.1', 'localhost'] or ip_address.startswith(('10.', '172.', '192.168.')):
                return 'Local'
            
            import requests
            response = requests.get(f"https://ipapi.co/{ip_address}/json/", timeout=5)
            response.raise_for_status()
            data = response.json()
            return data.get('country_name', 'Unknown')
        except (requests.exceptions.RequestException, requests.exceptions.Timeout) as e:
            logger.warning(f"Could not get country from IP {ip_address}: {e}")
            return 'Unknown'
        except Exception as e:
            logger.warning(f"Unexpected error getting country from IP {ip_address}: {e}")
            return 'Unknown'
    
    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """Toggle QR code status between active and inactive"""
        try:
            qr_code = self.get_object()
            qr_code.status = 'inactive' if qr_code.status == 'active' else 'active'
            qr_code.save()
            
            return Response({
                'id': qr_code.id,
                'status': qr_code.status,
                'message': f'QR code status changed to {qr_code.status}'
            })
        except Exception as e:
            return Response(
                {'error': f'Failed to toggle status: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download QR code image"""
        try:
            qr_code = self.get_object()
            
            if not qr_code.qr_image_url:
                return Response(
                    {'error': 'QR code image not found'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # For now, return the URL. In production, you might want to serve the actual file
            return Response({
                'download_url': qr_code.qr_image_url,
                'filename': f"{qr_code.title.replace(' ', '_')}_qr.png"
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to download QR code: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class QRCodeFileUploadView(APIView):
    """
    View for uploading files for QR codes
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Upload file and return file information"""
        try:
            file = request.FILES.get('file')
            if not file:
                return Response(
                    {'error': 'No file provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Upload file to Cloudinary
            upload_result = FileUploadHandler.upload_file_to_cloudinary(file)
            
            if not upload_result:
                return Response(
                    {'error': 'Failed to upload file'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Return file information without creating QRCodeFile record
            # The file will be associated with QR code when it's created
            return Response({
                'file_url': upload_result['url'],
                'file_name': file.name,
                'file_size': upload_result.get('bytes', file.size),
                'file_type': FileUploadHandler.get_file_type(file),
                'public_id': upload_result.get('public_id', '')
            })
            
        except Exception as e:
            logger.error(f"Error uploading file: {e}")
            return Response(
                {'error': 'Failed to upload file'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class QRCodeStatsView(APIView):
    """
    View for getting overall QR code statistics
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get QR code statistics for the user"""
        try:
            user_qr_codes = QRCode.objects.filter(user=request.user)
            
            # Basic stats
            total_qr_codes = user_qr_codes.count()
            active_qr_codes = user_qr_codes.filter(status='active').count()
            dynamic_qr_codes = user_qr_codes.filter(is_dynamic=True).count()
            static_qr_codes = user_qr_codes.filter(is_dynamic=False).count()
            
            # QR codes by type
            qr_codes_by_type = {}
            for qr_type, _ in QRCode.QR_TYPE_CHOICES:
                count = user_qr_codes.filter(qr_type=qr_type).count()
                if count > 0:
                    qr_codes_by_type[qr_type] = count
            
            # Recent QR codes
            recent_qr_codes = user_qr_codes.order_by('-created_at')[:5]
            
            # Total scans (for dynamic QR codes)
            total_scans = QRCodeScan.objects.filter(qr_code__user=request.user).count()
            
            # Recent scans
            recent_scans = QRCodeScan.objects.filter(
                qr_code__user=request.user
            ).order_by('-scanned_at')[:10]
            
            stats_data = {
                'total_qr_codes': total_qr_codes,
                'active_qr_codes': active_qr_codes,
                'dynamic_qr_codes': dynamic_qr_codes,
                'static_qr_codes': static_qr_codes,
                'qr_codes_by_type': qr_codes_by_type,
                'total_scans': total_scans,
                'recent_qr_codes': QRCodeSerializer(recent_qr_codes, many=True).data,
                'recent_scans': QRCodeScanSerializer(recent_scans, many=True).data,
            }
            
            return Response(stats_data)
            
        except Exception as e:
            logger.error(f"Error getting QR code stats: {e}")
            return Response(
                {'error': 'Failed to get statistics'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class QRCodeAnalyticsView(APIView):
    """
    View for getting QR code analytics with time series and breakdowns
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get QR code analytics for the user with time series and breakdowns"""
        try:
            user = request.user
            date_range = request.query_params.get('range', '30d')
            now = timezone.now()
            days_map = {
                '7d': 7,
                '30d': 30,
                '90d': 90,
                '180d': 180,
                '365d': 365,
            }
            days = days_map.get(date_range, 30)
            start_dt = now - timedelta(days=days - 1)

            # QuerySets
            qr_codes_qs = QRCode.objects.filter(user=user, created_at__date__gte=start_dt.date())
            scans_qs = QRCodeScan.objects.filter(qr_code__user=user, scanned_at__date__gte=start_dt.date())

            # Build daily buckets for QR codes created
            qr_code_dates = [dt.date().isoformat() for dt in qr_codes_qs.values_list('created_at', flat=True)]
            scan_dates = [dt.date().isoformat() for dt in scans_qs.values_list('scanned_at', flat=True)]
            qr_codes_counter = Counter(qr_code_dates)
            scans_counter = Counter(scan_dates)

            # Zero-fill date buckets for continuity
            day_cursor = start_dt.date()
            date_buckets = []
            while day_cursor <= now.date():
                date_buckets.append(day_cursor)
                day_cursor = day_cursor + timedelta(days=1)

            qr_codes_counts = dict(qr_codes_counter)
            scans_counts = dict(scans_counter)

            qr_codes_series = [{'date': d.isoformat(), 'count': int(qr_codes_counts.get(d.isoformat(), 0))} for d in date_buckets]
            scans_series = [{'date': d.isoformat(), 'count': int(scans_counts.get(d.isoformat(), 0))} for d in date_buckets]

            # Breakdowns
            # Countries (from scans)
            countries_qs = scans_qs.values('country').annotate(count=Count('id')).order_by('-count')[:10]
            countries = [{'label': (item['country'] or 'Unknown'), 'count': item['count']} for item in countries_qs]
            
            # If no scan data, provide sample data for demonstration
            if not countries:
                countries = [
                    {'label': 'United States', 'count': 0},
                    {'label': 'United Kingdom', 'count': 0},
                    {'label': 'Canada', 'count': 0},
                    {'label': 'Germany', 'count': 0},
                    {'label': 'France', 'count': 0},
                ]

            # Devices (from scans)
            devices_qs = scans_qs.values('device_type').annotate(count=Count('id')).order_by('-count')[:10]
            devices = [{'label': (item['device_type'] or 'Unknown'), 'count': item['count']} for item in devices_qs]
            
            # If no scan data, provide sample data for demonstration
            if not devices:
                devices = [
                    {'label': 'mobile', 'count': 0},
                    {'label': 'desktop', 'count': 0},
                    {'label': 'tablet', 'count': 0},
                ]

            # OS (from scans)
            os_qs = scans_qs.values('os').annotate(count=Count('id')).order_by('-count')[:10]
            os_list = [{'label': (item['os'] or 'Unknown'), 'count': item['count']} for item in os_qs]
            
            # If no scan data, provide sample data for demonstration
            if not os_list:
                os_list = [
                    {'label': 'android', 'count': 0},
                    {'label': 'ios', 'count': 0},
                    {'label': 'windows', 'count': 0},
                    {'label': 'macos', 'count': 0},
                    {'label': 'linux', 'count': 0},
                ]

            # Browsers (from scans)
            browsers_qs = scans_qs.values('browser').annotate(count=Count('id')).order_by('-count')[:10]
            browsers = [{'label': (item['browser'] or 'Unknown'), 'count': item['count']} for item in browsers_qs]
            
            # If no scan data, provide sample data for demonstration
            if not browsers:
                browsers = [
                    {'label': 'chrome', 'count': 0},
                    {'label': 'safari', 'count': 0},
                    {'label': 'firefox', 'count': 0},
                    {'label': 'edge', 'count': 0},
                ]

            # QR Types (from QR codes)
            qr_types_qs = qr_codes_qs.values('qr_type').annotate(count=Count('id')).order_by('-count')
            qr_types = [{'label': item['qr_type'], 'count': item['count']} for item in qr_types_qs]

            # Totals
            total_qr_codes = QRCode.objects.filter(user=user).count()
            total_scans = QRCodeScan.objects.filter(qr_code__user=user).count()
            active_qr_codes = QRCode.objects.filter(user=user, status='active').count()
            dynamic_qr_codes = QRCode.objects.filter(user=user, is_dynamic=True).count()

            analytics_data = {
                'range': date_range,
                'interval': 'day',
                'totals': {
                    'total_qr_codes': total_qr_codes,
                    'total_scans': total_scans,
                    'active_qr_codes': active_qr_codes,
                    'dynamic_qr_codes': dynamic_qr_codes,
                },
                'series': {
                    'qr_codes_created': qr_codes_series,
                    'scans': scans_series,
                },
                'breakdowns': {
                    'countries': countries,
                    'devices': devices,
                    'os': os_list,
                    'browsers': browsers,
                    'qr_types': qr_types,
                },
                'updated_at': now.isoformat(),
            }

            return Response(analytics_data)

        except Exception as e:
            logger.error(f"Error getting QR code analytics: {e}")
            return Response(
                {'error': 'Failed to get analytics'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
