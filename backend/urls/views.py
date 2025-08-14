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
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from django.utils.text import slugify
from django.core.cache import cache
import qrcode
from io import BytesIO

from .models import ShortenedURL, URLClick, Notification
from .serializers import (
    ShortenedURLSerializer, ShortenedURLCreateSerializer,
    URLClickSerializer, URLStatsSerializer, NotificationSerializer,
    parse_user_agent,
)

# Cache helpers
USER_URLS_KEY = lambda user_id: f"user:{user_id}:urls"
USER_STATS_KEY = lambda user_id: f"user:{user_id}:stats"
URL_CLICKS_KEY = lambda url_id: f"url:{url_id}:clicks"

URLS_TTL = 15  # seconds
STATS_TTL = 60
CLICKS_TTL = 20
ANALYTICS_TTL = 10

ANALYTICS_KEY = lambda user_id, date_range: f"user:{user_id}:analytics:{date_range}"

def invalidate_user_analytics_cache(user_id: int):
    try:
        for dr in ["7d", "30d", "90d", "180d", "365d"]:
            cache.delete(ANALYTICS_KEY(user_id, dr))
    except Exception:
        pass

class ShortenedURLViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing shortened URLs.
    """
    serializer_class = ShortenedURLSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return URLs for the current user"""
        return ShortenedURL.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        """Use different serializer for creation"""
        if self.action == 'create':
            return ShortenedURLCreateSerializer
        return ShortenedURLSerializer
    
    def list(self, request, *args, **kwargs):
        """Cache the paginated list per user for a short TTL."""
        try:
            cache_key = USER_URLS_KEY(request.user.id)
            cached = cache.get(cache_key)
            if cached is not None:
                return Response(cached)
        except Exception:
            cache_key = None
        response = super().list(request, *args, **kwargs)
        if cache_key:
            try:
                cache.set(cache_key, response.data, URLS_TTL)
            except Exception:
                pass
        return response

    def perform_create(self, serializer):
        """Create a new shortened URL and invalidate caches."""
        url_obj = serializer.save(user=self.request.user)
        # Invalidate user's lists and stats
        cache.delete_many([USER_URLS_KEY(self.request.user.id), USER_STATS_KEY(self.request.user.id)])
        invalidate_user_analytics_cache(self.request.user.id)
        
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
        instance = self.get_object()
        response = super().destroy(request, *args, **kwargs)
        cache.delete_many([
            USER_URLS_KEY(request.user.id),
            USER_STATS_KEY(request.user.id),
            URL_CLICKS_KEY(instance.id),
        ])
        invalidate_user_analytics_cache(request.user.id)
        return response

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle the active status of a URL and invalidate caches."""
        url_obj = self.get_object()
        url_obj.is_active = not url_obj.is_active
        url_obj.save()
        cache.delete_many([
            USER_URLS_KEY(request.user.id),
            USER_STATS_KEY(request.user.id),
        ])
        invalidate_user_analytics_cache(request.user.id)
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
        """Get click statistics for a specific URL (cached briefly)."""
        url_obj = self.get_object()
        cache_key = URL_CLICKS_KEY(url_obj.id)
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)
        clicks = URLClick.objects.filter(shortened_url=url_obj)
        serializer = URLClickSerializer(clicks, many=True)
        data = serializer.data
        try:
            cache.set(cache_key, data, CLICKS_TTL)
        except Exception:
            pass
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get overall statistics for the user's URLs (cached)."""
        cache_key = USER_STATS_KEY(request.user.id)
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        user = request.user
        today = timezone.now().date()
        user_urls = ShortenedURL.objects.filter(user=user)
        total_urls = user_urls.count()
        total_clicks = sum(url.click_count for url in user_urls)
        urls_created_today = user_urls.filter(created_at__date=today).count()
        today_clicks = URLClick.objects.filter(
            shortened_url__user=user,
            clicked_at__date=today
        ).count()
        top_urls = user_urls.order_by('-click_count')[:5]
        
        stats_data = {
            'total_urls': total_urls,
            'total_clicks': total_clicks,
            'urls_created_today': urls_created_today,
            'clicks_today': today_clicks,
            'top_urls': ShortenedURLSerializer(top_urls, many=True, context={'request': request}).data
        }
        try:
            cache.set(cache_key, stats_data, STATS_TTL)
        except Exception:
            pass
        return Response(stats_data)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Analytics for the current user's URLs: time series and breakdowns.

        Query params:
        - range: 7d | 30d | 90d | 180d | 365d (default 30d)
        """
        user = request.user
        date_range = request.query_params.get('range', '30d')
        cache_key = ANALYTICS_KEY(user.id, date_range)
        try:
            cached = cache.get(cache_key)
        except Exception:
            cached = None
        if cached is not None:
            return Response(cached)

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

        analytics_data = {
            'range': date_range,
            'interval': 'day',
            'totals': {
                'total_urls': urls_qs.count(),
                'total_clicks': clicks_qs.count(),
            },
            'series': {
                'urls_created': urls_series,
                'clicks': clicks_series,
            },
            'breakdowns': {
                'countries': countries,
                'devices': to_sorted_list(device_counts),
                'os': to_sorted_list(os_counts),
                'browsers': to_sorted_list(browser_counts),
                'referrers': to_sorted_list(referrer_counts),
            },
            'updated_at': now.isoformat(),
        }

        try:
            cache.set(cache_key, analytics_data, ANALYTICS_TTL)
        except Exception:
            pass

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
            
            # Invalidate caches impacted by clicks
            try:
                cache.delete_many([
                    USER_STATS_KEY(shortened_url.user_id),
                    URL_CLICKS_KEY(shortened_url.id),
                ])
                invalidate_user_analytics_cache(shortened_url.user_id)
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
            print(f"Error recording click: {e}")


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
