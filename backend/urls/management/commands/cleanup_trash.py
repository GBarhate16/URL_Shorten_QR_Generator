from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from urls.models import ShortenedURL
from qr_codes.models import QRCode
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Clean up expired trash items (items older than 15 days)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No items will be deleted'))
        
        # Get items that are due for permanent deletion
        urls_to_delete = ShortenedURL.objects.filter(
            is_deleted=True,
            deleted_at__lte=timezone.now() - timezone.timedelta(days=15)
        )
        
        qr_codes_to_delete = QRCode.objects.filter(
            is_deleted=True,
            deleted_at__lte=timezone.now() - timezone.timedelta(days=15)
        )
        
        url_count = urls_to_delete.count()
        qr_count = qr_codes_to_delete.count()
        
        if url_count == 0 and qr_count == 0:
            self.stdout.write(self.style.SUCCESS('No expired trash items found'))
            return
        
        self.stdout.write(f'Found {url_count} URLs and {qr_count} QR codes for permanent deletion')
        
        if not dry_run:
            with transaction.atomic():
                # Delete URLs
                for url in urls_to_delete:
                    self.stdout.write(f'Permanently deleting URL: {url.short_code}')
                    url.hard_delete()
                
                # Delete QR codes
                for qr in qr_codes_to_delete:
                    self.stdout.write(f'Permanently deleting QR code: {qr.title}')
                    qr.hard_delete()
                
                logger.info(f'Cleanup completed: {url_count} URLs and {qr_count} QR codes permanently deleted')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully {"processed" if dry_run else "deleted"} {url_count} URLs and {qr_count} QR codes'
            )
        )
