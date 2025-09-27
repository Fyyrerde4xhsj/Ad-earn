from flask import Blueprint, request, Response, send_file
from services.validation_service import validate_url, validate_format
from services.video_service import download_video_stream
import os
import logging

# Create blueprint for download routes
download_bp = Blueprint('download', __name__)
logger = logging.getLogger(__name__)

@download_bp.route('/download', methods=['POST'])
def download_video():
    """
    Stream video download directly to client without permanent storage
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data or 'url' not in data or 'format_id' not in data:
            return jsonify({'error': 'URL and format ID are required'}), 400
        
        video_url = data['url']
        format_id = data['format_id']
        
        # Validate inputs
        url_validation = validate_url(video_url)
        if not url_validation['valid']:
            return jsonify({'error': url_validation['message']}), 400
        
        format_validation = validate_format(format_id)
        if not format_validation['valid']:
            return jsonify({'error': format_validation['message']}), 400
        
        # Get optional filename
        filename = data.get('filename', 'video')
        
        # Stream video directly to client
        return download_video_stream(video_url, format_id, filename)
        
    except Exception as e:
        logger.error(f"Download error: {str(e)}")
        return jsonify({
            'error': 'Download failed. Please try again.'
        }), 500