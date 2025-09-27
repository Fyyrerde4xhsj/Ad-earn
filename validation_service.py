import re
from urllib.parse import urlparse

def validate_url(url):
    """
    Validate video URL format and allowed domains
    """
    # Basic URL validation
    try:
        parsed = urlparse(url)
        if not parsed.scheme in ('http', 'https'):
            return {'valid': False, 'message': 'Invalid URL scheme'}
        
        if not parsed.netloc:
            return {'valid': False, 'message': 'Invalid URL format'}
        
        # Add your allowed domains here for security
        allowed_domains = [
            'youtube.com', 'www.youtube.com', 'youtu.be',
            'vimeo.com', 'www.vimeo.com',
            'dailymotion.com', 'www.dailymotion.com'
            # Add other lawful content platforms as needed
        ]
        
        domain = parsed.netloc.lower()
        if not any(allowed in domain for allowed in allowed_domains):
            return {
                'valid': False, 
                'message': 'Domain not supported. Only educational/lawful content platforms allowed.'
            }
        
        return {'valid': True}
        
    except Exception as e:
        return {'valid': False, 'message': 'Invalid URL format'}

def validate_format(format_id):
    """
    Validate format ID to prevent injection attacks
    """
    # Allow only alphanumeric characters, dashes, and underscores
    if not re.match(r'^[a-zA-Z0-9_-]+$', str(format_id)):
        return {'valid': False, 'message': 'Invalid format ID'}
    
    return {'valid': True}