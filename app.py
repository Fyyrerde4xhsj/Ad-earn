from flask import Flask, send_from_directory
from flask_cors import CORS
import os
from datetime import datetime, timedelta
import threading
import time

# Import routes
from routes.download_routes import download_bp
from routes.info_routes import info_bp

def create_app():
    app = Flask(__name__)
    
    # Enable CORS for frontend-backend communication
    CORS(app)
    
    # Configuration
    app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size
    app.config['DOWNLOAD_FOLDER'] = 'downloads'
    app.config['CLEANUP_INTERVAL'] = 3600  # Cleanup every hour
    
    # Create downloads directory if it doesn't exist
    if not os.path.exists(app.config['DOWNLOAD_FOLDER']):
        os.makedirs(app.config['DOWNLOAD_FOLDER'])
    
    # Register blueprints (routes)
    app.register_blueprint(download_bp, url_prefix='/api')
    app.register_blueprint(info_bp, url_prefix='/api')
    
    # Serve frontend static files (for production)
    @app.route('/')
    def serve_frontend():
        return send_from_directory('../frontend', 'index.html')
    
    @app.route('/<path:path>')
    def serve_static_files(path):
        return send_from_directory('../frontend', path)
    
    return app

def cleanup_old_files():
    """Background thread to clean up old files in downloads folder"""
    def cleanup():
        while True:
            try:
                app = create_app()
                with app.app_context():
                    download_folder = app.config['DOWNLOAD_FOLDER']
                    current_time = datetime.now()
                    
                    for filename in os.listdir(download_folder):
                        filepath = os.path.join(download_folder, filename)
                        if os.path.isfile(filepath):
                            # Delete files older than 1 hour
                            file_time = datetime.fromtimestamp(os.path.getctime(filepath))
                            if current_time - file_time > timedelta(hours=1):
                                os.remove(filepath)
                                print(f"Cleaned up: {filename}")
                
                time.sleep(app.config['CLEANUP_INTERVAL'])
            except Exception as e:
                print(f"Cleanup error: {e}")
                time.sleep(300)  # Wait 5 minutes on error
    
    # Start cleanup thread
    cleanup_thread = threading.Thread(target=cleanup, daemon=True)
    cleanup_thread.start()

if __name__ == '__main__':
    app = create_app()
    
    # Start cleanup thread
    cleanup_old_files()
    
    # Run Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)