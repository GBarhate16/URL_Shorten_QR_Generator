import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

User = get_user_model()

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Get user from scope
        self.user = self.scope["user"]
        
        if self.user.is_anonymous:
            await self.close()
            return
        
        # Join user-specific room
        self.room_name = f"user_{self.user.id}"
        self.room_group_name = f"notifications_{self.user.id}"
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to notifications'
        }))
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Handle incoming messages from WebSocket"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'mark_read':
                await self.mark_notification_read(data.get('notification_id'))
            elif message_type == 'get_notifications':
                await self.send_notifications()
                
        except json.JSONDecodeError:
            pass
    
    async def notification_message(self, event):
        """Send notification to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': event['notification']
        }))
    
    async def url_click_update(self, event):
        """Send URL click update to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'url_click_update',
            'url_id': event['url_id'],
            'click_count': event['click_count']
        }))
    
    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        """Mark notification as read"""
        from .models import Notification
        try:
            notification = Notification.objects.get(
                id=notification_id,
                user=self.user
            )
            notification.is_read = True
            notification.save()
        except Notification.DoesNotExist:
            pass
    
    @database_sync_to_async
    def send_notifications(self):
        """Send recent notifications"""
        from .models import Notification
        notifications = Notification.objects.filter(
            user=self.user,
            is_read=False
        ).order_by('-created_at')[:10]
        
        return [
            {
                'id': n.id,
                'type': n.notification_type,
                'title': n.title,
                'message': n.message,
                'data': n.data,
                'created_at': n.created_at.isoformat(),
                'is_read': n.is_read
            }
            for n in notifications
        ]


def send_notification_to_user(user_id, message):
    """Send notification to specific user"""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"notifications_{user_id}",
            {
                'type': 'notification_message',
                'notification': message['notification']
            }
        )
    except Exception as e:
        # Log the error but don't break the application
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to send WebSocket notification via channel layer: {e}")
        # Continue without WebSocket notification


def send_url_click_update(user_id, url_id, click_count):
    """Send URL click update to specific user"""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"notifications_{user_id}",
            {
                'type': 'url_click_update',
                'url_id': url_id,
                'click_count': click_count
            }
        )
    except Exception as e:
        # Log the error but don't break the application
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to send URL click update via channel layer: {e}")
        # Continue without WebSocket notification
