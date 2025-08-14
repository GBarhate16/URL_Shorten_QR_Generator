from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = "Check Redis cache and Channels connectivity"

    def handle(self, *args, **options):
        from django.core.cache import cache
        self.stdout.write(self.style.MIGRATE_HEADING("Checking Redis cache..."))
        try:
            cache_key = "health:redis"
            cache.set(cache_key, "ok", timeout=10)
            value = cache.get(cache_key)
            if value == "ok":
                self.stdout.write(self.style.SUCCESS("✅ Cache set/get OK"))
            else:
                self.stdout.write(self.style.ERROR("❌ Cache get failed"))
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"❌ Cache error: {exc}"))

        self.stdout.write(self.style.MIGRATE_HEADING("Checking Channels layer..."))
        try:
            import asyncio
            from channels.layers import get_channel_layer

            async def ping_layer():
                layer = get_channel_layer()
                test_channel = "health-check"
                # Send and receive a message on a test group
                await layer.group_add(test_channel, "test!health")
                await layer.group_send(test_channel, {"type": "health.message", "text": "ping"})
                await layer.group_discard(test_channel, "test!health")

            # Run a tiny event loop just for the check
            asyncio.run(ping_layer())
            self.stdout.write(self.style.SUCCESS("✅ Channels layer reachable"))
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"❌ Channels error: {exc}"))

        self.stdout.write(self.style.HTTP_INFO(f"REDIS_URL: {getattr(settings, 'REDIS_URL', 'unset')}"))
        self.stdout.write(self.style.HTTP_INFO(f"CHANNEL_LAYER_URL: {getattr(settings, 'CHANNEL_LAYER_URL', 'unset')}"))

