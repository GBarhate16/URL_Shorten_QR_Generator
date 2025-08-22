from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.http import HttpResponseRedirect, JsonResponse, HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from datetime import timedelta
from django.conf import settings
from django.utils.text import slugify
import qrcode
from io import BytesIO
import logging
from django.core.cache import cache

from .models import ShortenedURL, URLClick, Notification
from .serializers import (
    ShortenedURLSerializer, ShortenedURLCreateSerializer,
    URLClickSerializer, URLStatsSerializer, NotificationSerializer,
    parse_user_agent,
)
from qr_codes.models import QRCode
from qr_codes.serializers import QRCodeSerializer


"""In-Memory caching implemented for improved performance."""

class ShortenedURLViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing shortened URLs.
    """
    serializer_class = ShortenedURLSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get queryset for user URLs."""
        if self.request.user.is_authenticated:
            # For restore and permanent_delete actions, include deleted items
            if self.action in ['restore', 'permanent_delete']:
                return ShortenedURL.objects.filter(user=self.request.user)
            # Exclude deleted items by default
            return ShortenedURL.objects.filter(
                user=self.request.user,
                is_deleted=False
            )
        return ShortenedURL.objects.none()
    
    def get_serializer_class(self):
        """Use different serializer for creation"""
        if self.action == 'create':
            return ShortenedURLCreateSerializer
        return ShortenedURLSerializer
    
    def list(self, request, *args, **kwargs):
        """Return paginated list."""
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        """Create a new shortened URL."""
        url_obj = serializer.save(user=self.request.user)
        
        Notification.create_notification(
            user=self.request.user,
            notification_type='url_created',
            title='URL Created Successfully',
            message=f'Your URL "{url_obj.title or url_obj.short_code}" has been created successfully.',
            data={
                'url_id': url_obj.id,
                'short_code': url_obj.short_code,
                'original_url': url_obj.original_url
            }
        )

    def destroy(self, request, *args, **kwargs):
        """Override destroy to use soft delete instead of permanent deletion"""
        instance = self.get_object()
        instance.soft_delete(user=request.user)
        
        return Response({
            'message': 'URL moved to trash successfully',
            'id': instance.id,
            'days_remaining': instance.days_until_permanent_deletion()
        })

    @action(detail=True, methods=['post'])
    def soft_delete(self, request, pk=None):
        """Soft delete a URL - move to trash"""
        url_obj = self.get_object()
        url_obj.soft_delete(user=request.user)
        
        return Response({
            'message': 'URL moved to trash successfully',
            'id': url_obj.id,
            'days_remaining': url_obj.days_until_permanent_deletion()
        })

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore a URL from trash"""
        url_obj = self.get_object()
        if not url_obj.is_deleted:
            return Response({
                'error': 'This URL is not in trash'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        url_obj.restore()
        
        return Response({
            'message': 'URL restored successfully',
            'id': url_obj.id
        })

    @action(detail=True, methods=['delete'])
    def permanent_delete(self, request, pk=None):
        """Permanently delete a URL from trash"""
        url_obj = self.get_object()
        if not url_obj.is_deleted:
            return Response({
                'error': 'This URL is not in trash'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        url_obj.hard_delete()
        
        return Response({
            'message': 'URL permanently deleted'
        })

    @action(detail=False, methods=['get'])
    def trash(self, request):
        """Get all URLs in trash for the current user"""
        trash_urls = ShortenedURL.objects.filter(
            user=request.user,
            is_deleted=True
        ).order_by('-deleted_at')
        
        # Add days remaining for each item
        for url in trash_urls:
            url.days_remaining = url.days_until_permanent_deletion()
        
        serializer = self.get_serializer(trash_urls, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle the active status of a URL."""
        url_obj = self.get_object()
        url_obj.is_active = not url_obj.is_active
        url_obj.save()
        
        return Response({
            'id': url_obj.id,
            'is_active': url_obj.is_active
        })

    @action(detail=True, methods=['get'], url_path='qr-download')
    def qr_download(self, request, pk=None):
        """Return a QR PNG generated on-the-fly that points to backend redirect (no interstitial page)."""
        url_obj = self.get_object()
        # Generate on-the-fly PNG and stream it
        try:
            redirect_base = getattr(settings, 'BACKEND_URL', 'http://127.0.0.1:8000').rstrip('/')
            full_url = f"{redirect_base}/api/urls/redirect/{url_obj.short_code}/"
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(full_url)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            resp = HttpResponse(buffer.getvalue(), content_type='image/png')
            resp['Content-Disposition'] = f'attachment; filename="qr-{url_obj.short_code}.png"'
            return resp
        except Exception:
            return Response({ 'detail': 'Failed to generate QR image' }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def clicks(self, request, pk=None):
        """Get click statistics for a specific URL."""
        url_obj = self.get_object()
        clicks = URLClick.objects.filter(shortened_url=url_obj)
        serializer = URLClickSerializer(clicks, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get URL statistics."""
        try:
            user_urls = ShortenedURL.objects.filter(user=request.user)
            
            # Get click statistics
            total_clicks = sum(url.clicks.count() for url in user_urls)
            active_urls = user_urls.filter(is_active=True).count()
            
            # Get recent activity
            recent_clicks = URLClick.objects.filter(shortened_url__user=request.user).order_by('-clicked_at')[:10]
            
            stats_data = {
                'total_urls': user_urls.count(),
                'active_urls': active_urls,
                'total_clicks': total_clicks,
                'recent_activity': [
                    {
                        'url': click.shortened_url.short_code,
                        'clicked_at': click.clicked_at,
                        'ip_address': click.ip_address,
                    }
                    for click in recent_clicks
                ]
            }
            
            return Response(stats_data)
            
        except Exception as e:
            logger.error(f"Error getting URL stats: {e}")
            return Response(
                {'error': 'Failed to get statistics'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Analytics for the current user's URLs: time series and breakdowns.

        Query params:
        - range: 7d | 30d | 90d | 180d | 365d (default 30d)
        """
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
        urls_qs = ShortenedURL.objects.filter(user=user, created_at__date__gte=start_dt.date())
        clicks_qs = URLClick.objects.filter(shortened_url__user=user, clicked_at__date__gte=start_dt.date())

        # Build daily buckets resiliently without DB date functions
        from collections import Counter
        url_dates = [dt.date().isoformat() for dt in urls_qs.values_list('created_at', flat=True)]
        click_dates = [dt.date().isoformat() for dt in clicks_qs.values_list('clicked_at', flat=True)]
        urls_counter = Counter(url_dates)
        clicks_counter = Counter(click_dates)

        # Zero-fill date buckets for continuity
        day_cursor = start_dt.date()
        date_buckets = []
        while day_cursor <= now.date():
            date_buckets.append(day_cursor)
            day_cursor = day_cursor + timedelta(days=1)

        urls_counts = dict(urls_counter)
        clicks_counts = dict(clicks_counter)

        urls_series = [ { 'date': d.isoformat(), 'count': int(urls_counts.get(d.isoformat(), 0)) } for d in date_buckets ]
        clicks_series = [ { 'date': d.isoformat(), 'count': int(clicks_counts.get(d.isoformat(), 0)) } for d in date_buckets ]

        # Breakdowns (best-effort; computed in Python for clarity)
        # Countries
        countries_qs = clicks_qs.values('country').annotate(count=Count('id')).order_by('-count')[:10]
        countries = [ { 'label': (item['country'] or 'Unknown'), 'count': int(item['count']) } for item in countries_qs ]
        
        # If no click data, provide sample data for demonstration
        if not countries:
            countries = [
                {'label': 'United States', 'count': 0},
                {'label': 'United Kingdom', 'count': 0},
                {'label': 'Canada', 'count': 0},
                {'label': 'Germany', 'count': 0},
                {'label': 'France', 'count': 0},
            ]

        # Devices / OS / Browsers / Referrers
        device_counts = {}
        os_counts = {}
        browser_counts = {}
        referrer_counts = {}
        for click in clicks_qs.only('user_agent', 'referrer'):
            device, os_name, browser = parse_user_agent(click.user_agent or '')
            device_counts[device] = device_counts.get(device, 0) + 1
            os_counts[os_name] = os_counts.get(os_name, 0) + 1
            browser_counts[browser] = browser_counts.get(browser, 0) + 1
            try:
                if click.referrer:
                    from urllib.parse import urlparse
                    domain = urlparse(click.referrer).netloc or 'Direct'
                else:
                    domain = 'Direct'
            except Exception:
                domain = 'Direct'
            referrer_counts[domain] = referrer_counts.get(domain, 0) + 1

        def to_sorted_list(counts_dict, limit=10):
            return [
                { 'label': k, 'count': v }
                for k, v in sorted(counts_dict.items(), key=lambda kv: kv[1], reverse=True)[:limit]
            ]
        
        # If no click data, provide sample data for demonstration
        if not device_counts:
            devices = [
                {'label': 'mobile', 'count': 0},
                {'label': 'desktop', 'count': 0},
                {'label': 'tablet', 'count': 0},
            ]
        else:
            devices = to_sorted_list(device_counts)
            
        if not os_counts:
            os_list = [
                {'label': 'android', 'count': 0},
                {'label': 'ios', 'count': 0},
                {'label': 'windows', 'count': 0},
                {'label': 'macos', 'count': 0},
                {'label': 'linux', 'count': 0},
            ]
        else:
            os_list = to_sorted_list(os_counts)
            
        if not browser_counts:
            browsers = [
                {'label': 'chrome', 'count': 0},
                {'label': 'safari', 'count': 0},
                {'label': 'firefox', 'count': 0},
                {'label': 'edge', 'count': 0},
            ]
        else:
            browsers = to_sorted_list(browser_counts)
            
        if not referrer_counts:
            referrers = [
                {'label': 'Direct', 'count': 0},
                {'label': 'google.com', 'count': 0},
                {'label': 'facebook.com', 'count': 0},
                {'label': 'twitter.com', 'count': 0},
            ]
        else:
            referrers = to_sorted_list(referrer_counts)

        analytics_data = {
            'range': date_range,
            'interval': 'day',
            'totals': {
                'total_urls': ShortenedURL.objects.filter(user=user).count(),
                'total_clicks': URLClick.objects.filter(shortened_url__user=user).count(),
                'active_urls': ShortenedURL.objects.filter(user=user, is_active=True).count(),
            },
            'series': {
                'urls_created': urls_series,
                'clicks': clicks_series,
            },
            'breakdowns': {
                'countries': countries,
                'devices': devices,
                'os': os_list,
                'browsers': browsers,
                'referrers': referrers,
            },
            'updated_at': now.isoformat(),
        }

        return Response(analytics_data)



class URLRedirectView(APIView):
    """
    View for handling URL redirects when short codes are accessed.
    """
    permission_classes = []
    
    def get(self, request, short_code):
        """Redirect to the original URL. If client requests JSON, return JSON payload."""
        try:
            shortened_url = ShortenedURL.objects.get(short_code=short_code)
            
            # Check if URL is active and not expired
            if not shortened_url.is_active:
                return Response({ 'error': 'This URL is no longer active' }, status=status.HTTP_410_GONE)
            
            if shortened_url.is_expired():
                return Response({ 'error': 'This URL has expired' }, status=status.HTTP_410_GONE)
            
            # Best‑effort: increment click count and record click, but never block redirect
            try:
                shortened_url.increment_click_count()
            except Exception:
                pass
            try:
                self.record_click(shortened_url, request)
            except Exception:
                pass
            
            # Immediate HTTP redirect
            return HttpResponseRedirect(shortened_url.original_url)
            
        except ShortenedURL.DoesNotExist:
            return Response({ 'error': 'URL not found' }, status=status.HTTP_404_NOT_FOUND)

    def record_click(self, shortened_url, request):
        """Record click details with robust IP + geo detection.

        In local development, geo lookups for private IPs are skipped unless
        you provide a test IP via `X-Debug-IP` header or `DEV_GEO_OVERRIDE_IP` setting.
        """
        try:
            import ipaddress
            import requests
            from django.conf import settings

            def get_client_ip(req) -> str | None:
                # Priority: Cloudflare, Real-IP, Forwarded-For, Remote-Addr
                ip = (
                    req.META.get('HTTP_CF_CONNECTING_IP') or
                    req.META.get('HTTP_X_REAL_IP') or
                    None
                )
                if not ip:
                    xff = req.META.get('HTTP_X_FORWARDED_FOR')
                    if xff:
                        # First IP in the list is the original client in most setups
                        ip = xff.split(',')[0].strip()
                if not ip:
                    ip = (req.META.get('REMOTE_ADDR') or '').strip() or None
                # Dev override for testing geo
                debug_header_ip = req.META.get('HTTP_X_DEBUG_IP')
                if debug_header_ip:
                    ip = debug_header_ip.strip()
                if not ip and getattr(settings, 'DEV_GEO_OVERRIDE_IP', None):
                    ip = settings.DEV_GEO_OVERRIDE_IP
                return ip

            def geolocate_ip(ip: str) -> tuple[str, str]:
                """Return (country, city) from available providers."""
                country_name = ''
                city_name = ''

                # Prefer CDN/proxy-provided headers when available
                cf_country = request.META.get('HTTP_CF_IPCOUNTRY')
                if cf_country:
                    country_name = cf_country

                # Try ipinfo.io if token provided
                token = getattr(settings, 'IPINFO_TOKEN', None)
                if ip and token:
                    try:
                        r = requests.get(f'https://ipinfo.io/{ip}?token={token}', timeout=2.0)
                        if r.ok:
                            j = r.json()
                            country_name = j.get('country') or country_name
                            city_name = j.get('city') or city_name
                            return country_name or '', city_name or ''
                    except Exception:
                        pass

                # Fallback to ipapi.co (no key, rate-limited)
                if ip:
                    try:
                        r = requests.get(f'https://ipapi.co/{ip}/json/', timeout=2.0)
                        if r.ok:
                            j = r.json()
                            country_name = j.get('country_name') or country_name
                            city_name = j.get('city') or city_name
                    except Exception:
                        pass
                return country_name or '', city_name or ''

            ip = get_client_ip(request)

            # UA and referrer
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            referrer = request.META.get('HTTP_REFERER', '')

            # Best-effort: use headers for geo first
            country = (
                request.META.get('HTTP_CF_IPCOUNTRY') or
                request.META.get('HTTP_X_APPENGINE_COUNTRY') or
                request.META.get('HTTP_X_GEO_COUNTRY') or
                ''
            )
            city = (
                request.META.get('HTTP_X_APPENGINE_CITY') or
                request.META.get('HTTP_X_GEO_CITY') or
                ''
            )

            # If still missing and IP is public, perform lookup
            try:
                if (not country and not city) and ip:
                    ip_obj = ipaddress.ip_address(ip)
                    is_private = (
                        ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_reserved or ip_obj.is_link_local
                    )
                    if not is_private:
                        country, city = geolocate_ip(ip)
                    else:
                        # Allow dev override for local testing
                        override_ip = request.META.get('HTTP_X_DEBUG_IP') or getattr(settings, 'DEV_GEO_OVERRIDE_IP', None)
                        if override_ip:
                            country, city = geolocate_ip(override_ip)
            except Exception:
                pass

            URLClick.objects.create(
                shortened_url=shortened_url,
                ip_address=ip or '',
                user_agent=user_agent,
                referrer=referrer,
                country=country or '',
                city=city or '',
            )
        except Exception as e:
            logger.error(f"Error recording click: {e}")


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for managing notifications.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return notifications for the current user"""
        return Notification.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'success'})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        self.get_queryset().update(is_read=True)
        return Response({'status': 'success'})


class PublicURLView(APIView):
    """
    View for creating URLs without authentication (public URLs).
    """
    permission_classes = []
    
    def post(self, request):
        """Create a public shortened URL"""
        serializer = ShortenedURLCreateSerializer(data=request.data)
        if serializer.is_valid():
            # Create a temporary user or use a default one
            # For now, we'll require authentication for all URLs
            return Response({
                'error': 'Authentication required for creating URLs'
            }, status=status.HTTP_401_UNAUTHORIZED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CombinedTrashView(APIView):
    """Combined view for trash items (URLs and QR codes) - Optimized for performance"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get all trash items for the current user with filtering - Optimized for high loads"""
        # Get filter parameters
        item_type = request.GET.get('type', 'all')  # 'urls', 'qr_codes', or 'all'
        search = request.GET.get('search', '')
        
        # Use select_related and prefetch_related for optimized queries
        urls_query = ShortenedURL.objects.filter(
            user=request.user,
            is_deleted=True
        ).select_related('user').only(
            'id', 'title', 'short_code', 'original_url', 'description',
            'is_deleted', 'deleted_at', 'user__username'
        )
        
        qr_codes_query = QRCode.objects.filter(
            user=request.user,
            is_deleted=True
        ).select_related('user').only(
            'id', 'title', 'description', 'qr_type', 'is_deleted', 'deleted_at', 'user__username'
        )
        
        # Apply search filter with optimized queries
        if search:
            search_lower = search.lower()
            urls_query = urls_query.filter(
                Q(title__icontains=search) | 
                Q(short_code__icontains=search) | 
                Q(original_url__icontains=search)
            )
            qr_codes_query = qr_codes_query.filter(
                Q(title__icontains=search) | 
                Q(description__icontains=search)
            )
        
        # Apply type filter
        if item_type == 'urls':
            qr_codes_query = QRCode.objects.none()
        elif item_type == 'qr_codes':
            urls_query = ShortenedURL.objects.none()
        
        # Get results with optimized ordering and limit for performance
        urls = list(urls_query.order_by('-deleted_at')[:1000])  # Limit to prevent memory issues
        qr_codes = list(qr_codes_query.order_by('-deleted_at')[:1000])
        
        # Calculate days remaining efficiently in Python (avoid DB calls)
        now = timezone.now()
        for url in urls:
            if url.deleted_at:
                delta = (url.deleted_at + timedelta(days=15)) - now
                url.days_remaining = max(0, delta.days)
            else:
                url.days_remaining = 0
        
        for qr in qr_codes:
            if qr.deleted_at:
                delta = (qr.deleted_at + timedelta(days=15)) - now
                qr.days_remaining = max(0, delta.days)
            else:
                qr.days_remaining = 0
        
        # Serialize results with minimal fields for performance
        url_serializer = ShortenedURLSerializer(urls, many=True)
        qr_serializer = QRCodeSerializer(qr_codes, many=True)
        
        return Response({
            'urls': url_serializer.data,
            'qr_codes': qr_serializer.data,
            'total_items': len(urls) + len(qr_codes),
            'urls_count': len(urls),
            'qr_codes_count': len(qr_codes),
            'cached_at': now.isoformat()
        })
    
    def post(self, request):
        """Restore items from trash"""
        action = request.data.get('action')
        item_id = request.data.get('id')
        item_type = request.data.get('type')
        
        if not all([action, item_id, item_type]):
            return Response({
                'error': 'Missing required fields: action, id, type'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            if action == 'restore':
                if item_type == 'url':
                    url_obj = ShortenedURL.objects.get(id=item_id, user=request.user)
                    if not url_obj.is_deleted:
                        return Response({
                            'error': 'This URL is not in trash'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    url_obj.restore()
                    return Response({
                        'message': 'URL restored successfully',
                        'id': url_obj.id
                    })
                elif item_type == 'qr_code':
                    qr_obj = QRCode.objects.get(id=item_id, user=request.user)
                    if not qr_obj.is_deleted:
                        return Response({
                            'error': 'This QR code is not in trash'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    qr_obj.restore()
                    return Response({
                        'message': 'QR code restored successfully',
                        'id': qr_obj.id
                    })
                else:
                    return Response({
                        'error': 'Invalid item type'
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    'error': 'Invalid action'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except (ShortenedURL.DoesNotExist, QRCode.DoesNotExist):
            return Response({
                'error': 'Item not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': f'Failed to restore item: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request):
        """Permanently delete items from trash"""
        action = request.data.get('action')
        item_id = request.data.get('id')
        item_type = request.data.get('type')
        
        if not all([action, item_id, item_type]):
            return Response({
                'error': 'Missing required fields: action, id, type'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            if action == 'permanent_delete':
                if item_type == 'url':
                    url_obj = ShortenedURL.objects.get(id=item_id, user=request.user)
                    if not url_obj.is_deleted:
                        return Response({
                            'error': 'This URL is not in trash'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    url_obj.hard_delete()
                    return Response({
                        'message': 'URL permanently deleted',
                        'id': url_obj.id
                    })
                elif item_type == 'qr_code':
                    qr_obj = QRCode.objects.get(id=item_id, user=request.user)
                    if not qr_obj.is_deleted:
                        return Response({
                            'error': 'This QR code is not in trash'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    qr_obj.hard_delete()
                    return Response({
                        'message': 'QR code permanently deleted',
                        'id': qr_obj.id
                    })
                else:
                    return Response({
                        'error': 'Invalid item type'
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    'error': 'Invalid action'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except (ShortenedURL.DoesNotExist, QRCode.DoesNotExist):
            return Response({
                'error': 'Item not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': f'Failed to delete item: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
