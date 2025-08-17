import qrcode
from PIL import Image, ImageDraw
import requests
from io import BytesIO
import logging
from django.conf import settings
import cloudinary
import cloudinary.uploader

# Configure Cloudinary
cloudinary.config(
    cloud_name=getattr(settings, 'CLOUDINARY_CLOUD_NAME', None),
    api_key=getattr(settings, 'CLOUDINARY_API_KEY', None),
    api_secret=getattr(settings, 'CLOUDINARY_API_SECRET', None),
)

logger = logging.getLogger(__name__)


class QRCodeGenerator:
    """Utility class for generating QR codes with customization"""
    
    @staticmethod
    def generate_qr_code(content, customization=None):
        """
        Generate a QR code with customization options
        
        Args:
            content (str): Content to encode in QR code
            customization (dict): Customization options
            
        Returns:
            PIL.Image: Generated QR code image
        """
        try:
            # Default customization
            if customization is None:
                customization = {}
            
            # Extract customization options
            foreground_color = customization.get('foreground_color', '#000000')
            background_color = customization.get('background_color', '#FFFFFF')
            size = customization.get('size', 'medium')
            error_correction = customization.get('error_correction', 'M')
            border_width = customization.get('border_width', 4)
            logo_url = customization.get('logo_url', '')
            logo_size = customization.get('logo_size', 0.2)
            
            # Map size to box_size
            size_map = {
                'small': 8,
                'medium': 10,
                'large': 12
            }
            box_size = size_map.get(size, 10)
            
            # Map error correction
            error_correction_map = {
                'L': qrcode.constants.ERROR_CORRECT_L,
                'M': qrcode.constants.ERROR_CORRECT_M,
                'Q': qrcode.constants.ERROR_CORRECT_Q,
                'H': qrcode.constants.ERROR_CORRECT_H
            }
            error_correction_level = error_correction_map.get(error_correction, qrcode.constants.ERROR_CORRECT_M)
            
            # Create QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=error_correction_level,
                box_size=box_size,
                border=border_width
            )
            
            qr.add_data(content)
            qr.make(fit=True)
            
            # Create image with basic styling
            qr_image = qr.make_image(fill_color=foreground_color, back_color=background_color)
            
            # Add logo if provided
            if logo_url:
                qr_image = QRCodeGenerator.add_logo(qr_image, logo_url, logo_size)
            
            return qr_image
            
        except Exception as e:
            logger.error(f"Error generating QR code: {e}")
            # Return a simple QR code as fallback
            return QRCodeGenerator.generate_simple_qr(content)
    
    @staticmethod
    def generate_simple_qr(content):
        """Generate a simple QR code without customization"""
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=10,
                border=4
            )
            qr.add_data(content)
            qr.make(fit=True)
            
            return qr.make_image(fill_color="black", back_color="white")
            
        except Exception as e:
            logger.error(f"Error generating simple QR code: {e}")
            return None
    
    @staticmethod
    def add_logo(qr_image, logo_url, logo_size=0.2):
        """
        Add logo to QR code
        
        Args:
            qr_image (PIL.Image): QR code image
            logo_url (str): URL of the logo
            logo_size (float): Size of logo relative to QR code (0.1 to 0.5)
            
        Returns:
            PIL.Image: QR code with logo
        """
        try:
            # Download logo
            response = requests.get(logo_url, timeout=10)
            response.raise_for_status()
            
            logo = Image.open(BytesIO(response.content))
            
            # Convert logo to RGBA if needed
            if logo.mode != 'RGBA':
                logo = logo.convert('RGBA')
            
            # Calculate logo size
            qr_width, qr_height = qr_image.size
            logo_width = int(qr_width * logo_size)
            logo_height = int(qr_height * logo_size)
            
            # Resize logo
            logo = logo.resize((logo_width, logo_height), Image.Resampling.LANCZOS)
            
            # Calculate position (center)
            pos_x = (qr_width - logo_width) // 2
            pos_y = (qr_height - logo_height) // 2
            
            # Create a copy of QR image
            qr_with_logo = qr_image.copy()
            
            # Paste logo
            qr_with_logo.paste(logo, (pos_x, pos_y), logo)
            
            return qr_with_logo
            
        except Exception as e:
            logger.error(f"Error adding logo to QR code: {e}")
            return qr_image
    
    @staticmethod
    def upload_to_cloudinary(image, public_id=None):
        """
        Upload QR code image to Cloudinary
        
        Args:
            image (PIL.Image): QR code image
            public_id (str): Public ID for Cloudinary
            
        Returns:
            str: Cloudinary URL or base64 data URL as fallback
        """
        try:
            # Check if Cloudinary is configured
            if not getattr(settings, 'CLOUDINARY_CLOUD_NAME', None):
                logger.warning("Cloudinary not configured, using base64 fallback")
                return QRCodeGenerator.image_to_base64(image)
            
            # Convert PIL image to bytes
            buffer = BytesIO()
            image.save(buffer, format='PNG')
            buffer.seek(0)
            
            # Upload to Cloudinary
            upload_result = cloudinary.uploader.upload(
                buffer,
                folder='qr_codes',
                public_id=public_id,
                overwrite=True,
                resource_type='image',
                format='png',
            )
            
            return upload_result.get('secure_url') or upload_result.get('url')
            
        except Exception as e:
            logger.error(f"Error uploading to Cloudinary: {e}")
            # Fallback to base64
            return QRCodeGenerator.image_to_base64(image)
    
    @staticmethod
    def image_to_base64(image):
        """
        Convert PIL image to base64 data URL
        
        Args:
            image (PIL.Image): QR code image
            
        Returns:
            str: Base64 data URL
        """
        try:
            import base64
            buffer = BytesIO()
            image.save(buffer, format='PNG')
            buffer.seek(0)
            image_data = buffer.getvalue()
            base64_data = base64.b64encode(image_data).decode('utf-8')
            return f"data:image/png;base64,{base64_data}"
        except Exception as e:
            logger.error(f"Error converting image to base64: {e}")
            return None
    
    @staticmethod
    def save_to_media(image, filename):
        """
        Save QR code image to local media storage
        
        Args:
            image (PIL.Image): QR code image
            filename (str): Filename to save as
            
        Returns:
            str: Local file path
        """
        try:
            # Convert PIL image to bytes
            buffer = BytesIO()
            image.save(buffer, format='PNG')
            buffer.seek(0)
            
            # Save to media storage
            from django.core.files import File
            from django.core.files.base import ContentFile
            
            # Create ContentFile from buffer
            content_file = ContentFile(buffer.getvalue())
            
            return content_file
            
        except Exception as e:
            logger.error(f"Error saving to media: {e}")
            return None


class FileUploadHandler:
    """Utility class for handling file uploads for QR codes"""
    
    @staticmethod
    def upload_file_to_cloudinary(file, folder='qr_files'):
        """
        Upload file to Cloudinary
        
        Args:
            file: Django uploaded file
            folder (str): Cloudinary folder
            
        Returns:
            dict: Upload result with URL and metadata
        """
        try:
            # Check if Cloudinary is configured
            if not getattr(settings, 'CLOUDINARY_CLOUD_NAME', None):
                logger.warning("Cloudinary not configured, using local storage fallback")
                return FileUploadHandler.save_file_locally(file)
            
            # Upload to Cloudinary
            upload_result = cloudinary.uploader.upload(
                file,
                folder=folder,
                resource_type='auto',
                overwrite=True,
            )
            
            return {
                'url': upload_result.get('secure_url') or upload_result.get('url'),
                'public_id': upload_result.get('public_id'),
                'format': upload_result.get('format'),
                'bytes': upload_result.get('bytes'),
                'width': upload_result.get('width'),
                'height': upload_result.get('height'),
            }
            
        except Exception as e:
            logger.error(f"Error uploading file to Cloudinary: {e}")
            logger.info("Falling back to local storage")
            return FileUploadHandler.save_file_locally(file)
    
    @staticmethod
    def get_file_type(file):
        """Get file type from uploaded file"""
        try:
            # First try to use Django's content_type
            if hasattr(file, 'content_type') and file.content_type:
                return file.content_type
            
            # Fallback to file extension
            filename = file.name.lower()
            if filename.endswith('.pdf'):
                return 'application/pdf'
            elif filename.endswith(('.jpg', '.jpeg')):
                return 'image/jpeg'
            elif filename.endswith('.png'):
                return 'image/png'
            elif filename.endswith('.gif'):
                return 'image/gif'
            elif filename.endswith(('.mp4', '.avi', '.mov')):
                return 'video/mp4'
            elif filename.endswith(('.mp3', '.wav', '.ogg')):
                return 'audio/mpeg'
            elif filename.endswith('.txt'):
                return 'text/plain'
            elif filename.endswith('.doc'):
                return 'application/msword'
            elif filename.endswith('.docx'):
                return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            else:
                return 'application/octet-stream'
                
        except Exception as e:
            logger.error(f"Error getting file type: {e}")
            return 'application/octet-stream'
    
    @staticmethod
    def save_file_locally(file):
        """
        Save file to local media storage as fallback
        
        Args:
            file: Django uploaded file
            
        Returns:
            dict: File information
        """
        try:
            from django.core.files.storage import default_storage
            from django.core.files.base import ContentFile
            
            # Generate unique filename
            import uuid
            import os
            file_extension = os.path.splitext(file.name)[1]
            filename = f"qr_files/{uuid.uuid4()}{file_extension}"
            
            # Save file to media storage
            saved_path = default_storage.save(filename, ContentFile(file.read()))
            file.seek(0)  # Reset file pointer
            
            # Get file URL
            file_url = default_storage.url(saved_path)
            
            return {
                'url': file_url,
                'public_id': saved_path,
                'format': file_extension[1:] if file_extension else 'unknown',
                'bytes': file.size,
                'width': None,
                'height': None,
            }
            
        except Exception as e:
            logger.error(f"Error saving file locally: {e}")
            return None


class AnalyticsHelper:
    """Utility class for QR code analytics"""
    
    @staticmethod
    def parse_user_agent(user_agent):
        """
        Parse user agent string to extract device info
        
        Args:
            user_agent (str): User agent string
            
        Returns:
            dict: Parsed device information
        """
        try:
            # Simple parsing (you can use a more sophisticated library like user-agents)
            user_agent_lower = user_agent.lower()
            
            device_type = 'desktop'
            browser = 'unknown'
            os = 'unknown'
            
            # Detect device type
            if 'mobile' in user_agent_lower or 'android' in user_agent_lower or 'iphone' in user_agent_lower:
                device_type = 'mobile'
            elif 'tablet' in user_agent_lower or 'ipad' in user_agent_lower:
                device_type = 'tablet'
            
            # Detect browser
            if 'chrome' in user_agent_lower:
                browser = 'chrome'
            elif 'firefox' in user_agent_lower:
                browser = 'firefox'
            elif 'safari' in user_agent_lower:
                browser = 'safari'
            elif 'edge' in user_agent_lower:
                browser = 'edge'
            elif 'opera' in user_agent_lower:
                browser = 'opera'
            
            # Detect OS
            if 'windows' in user_agent_lower:
                os = 'windows'
            elif 'mac' in user_agent_lower or 'darwin' in user_agent_lower:
                os = 'macos'
            elif 'linux' in user_agent_lower:
                os = 'linux'
            elif 'android' in user_agent_lower:
                os = 'android'
            elif 'ios' in user_agent_lower or 'iphone' in user_agent_lower or 'ipad' in user_agent_lower:
                os = 'ios'
            
            return {
                'device_type': device_type,
                'browser': browser,
                'os': os
            }
            
        except Exception as e:
            logger.error(f"Error parsing user agent: {e}")
            return {
                'device_type': 'unknown',
                'browser': 'unknown',
                'os': 'unknown'
            }
