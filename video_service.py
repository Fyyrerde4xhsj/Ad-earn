import yt_dlp
import os
from flask import Response
import tempfile
import logging

logger = logging.getLogger(__name__)

def get_video_info(url):
    """
    Extract video information and available formats using yt-dlp
    """
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract video info without downloading
            info = ydl.extract_info(url, download=False)
            
            # Format the response with essential information
            formatted_info = {
                'title': info.get('title', 'Unknown'),
                'duration': info.get('duration', 0),
                'thumbnail': info.get('thumbnail', ''),
                'uploader': info.get('uploader', 'Unknown'),
                'formats': []
            }
            
            # Extract available formats
            for fmt in info.get('formats', []):
                if fmt.get('filesize') or fmt.get('filesize_approx'):
                    format_info = {
                        'format_id': fmt.get('format_id'),
                        'ext': fmt.get('ext', 'unknown'),
                        'resolution': fmt.get('resolution', 'unknown'),
                        'filesize': fmt.get('filesize') or fmt.get('filesize_approx', 0),
                        'format_note': fmt.get('format_note', '')
                    }
                    formatted_info['formats'].append(format_info)
            
            return formatted_info
            
    except Exception as e:
        logger.error(f"Error extracting video info: {str(e)}")
        raise Exception(f"Could not fetch video information: {str(e)}")

def download_video_stream(url, format_id, filename):
    """
    Stream video directly to client without permanent storage
    """
    # Create temporary file that will be auto-deleted
    temp_dir = tempfile.gettempdir()
    temp_filename = f"temp_video_{os.urandom(8).hex()}"
    temp_path = os.path.join(temp_dir, temp_filename)
    
    ydl_opts = {
        'format': format_id,
        'outtmpl': temp_path + '.%(ext)s',
        'quiet': True,
        'no_warnings': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Download video info to get final filename
            info = ydl.extract_info(url, download=True)
            actual_filename = ydl.prepare_filename(info)
            
            # Get file extension from format
            ext = info.get('ext', 'mp4')
            final_filename = f"{filename}.{ext}"
            
            # Create generator function to stream file
            def generate():
                with open(actual_filename, 'rb') as f:
                    while True:
                        data = f.read(4096)  # Read in 4KB chunks
                        if not data:
                            break
                        yield data
                
                # Clean up temporary file after streaming
                try:
                    os.unlink(actual_filename)
                except:
                    pass
            
            # Stream response with appropriate headers
            return Response(
                generate(),
                mimetype='video/mp4',
                headers={
                    'Content-Disposition': f'attachment; filename="{final_filename}"',
                    'Content-Type': 'application/octet-stream'
                }
            )
            
    except Exception as e:
        # Clean up on error
        try:
            if os.path.exists(actual_filename):
                os.unlink(actual_filename)
        except:
            pass
        logger.error(f"Streaming error: {str(e)}")
        raise Exception(f"Download failed: {str(e)}")