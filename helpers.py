import os
import humanize
from datetime import datetime

def format_file_size(size_bytes):
    """
    Convert file size to human-readable format
    """
    if not size_bytes:
        return "Unknown"
    return humanize.naturalsize(size_bytes)

def sanitize_filename(filename):
    """
    Remove invalid characters from filename
    """
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        filename = filename.replace(char, '_')
    return filename[:100]  # Limit filename length