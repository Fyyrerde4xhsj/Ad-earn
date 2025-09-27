from flask import Blueprint, request, jsonify
from services.validation_service import validate_url
from services.video_service import get_video_info
import logging

# Create blueprint for info routes
info_bp = Blueprint('info', __name__)
logger = logging.getLogger(__name__)

@info_bp.route('/video-info', methods=['POST'])
def get_video_information():
    """
    Fetch available formats and information for a video URL
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data or 'url' not in data:
            return jsonify({'error': 'URL is required'}), 400
        
        video_url = data['url']
        
        # Validate URL
        validation_result = validate_url(video_url)
        if not validation_result['valid']:
            return jsonify({'error': validation_result['message']}), 400
        
        # Get video information using yt-dlp
        video_info = get_video_info(video_url)
        
        return jsonify({
            'success': True,
            'data': video_info
        })
        
    except Exception as e:
        logger.error(f"Error fetching video info: {str(e)}")
        return jsonify({
            'error': 'Failed to fetch video information. Please check the URL and try again.'
        }), 500