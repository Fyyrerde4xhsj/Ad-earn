class MobileVideoDownloader {
    constructor() {
        this.apiBase = '/api';
        this.currentFormats = [];
        this.selectedFormat = null;
        this.isMobile = this.checkMobile();
        
        this.initializeEventListeners();
        this.setupPasteSupport();
        this.setupTouchFeedback();
    }

    checkMobile() {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    initializeEventListeners() {
        // Fetch button
        document.getElementById('fetchInfoBtn').addEventListener('click', () => this.fetchVideoInfo());
        
        // URL input events
        const urlInput = document.getElementById('videoUrl');
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.fetchVideoInfo();
        });
        
        // Download button
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadVideo());
        
        // Quick actions
        document.querySelector('.paste-btn').addEventListener('click', () => this.pasteFromClipboard());
        document.querySelector('.clear-btn').addEventListener('click', () => this.clearInput());
        
        // Handle visibility changes (for mobile backgrounding)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handleAppBackground();
            }
        });
    }

    setupPasteSupport() {
        const urlInput = document.getElementById('videoUrl');
        
        urlInput.addEventListener('paste', (e) => {
            // Show paste animation
            this.showTouchFeedback(e);
            
            setTimeout(() => {
                const pastedText = e.clipboardData.getData('text');
                if (this.isValidUrl(pastedText)) {
                    urlInput.value = pastedText;
                    // Auto-fetch if URL looks valid
                    if (pastedText.includes('youtube.com') || pastedText.includes('youtu.be')) {
                        setTimeout(() => this.fetchVideoInfo(), 300);
                    }
                }
            }, 100);
        });
    }

    setupTouchFeedback() {
        document.addEventListener('touchstart', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                this.showTouchFeedback(e);
            }
        }, { passive: true });
    }

    showTouchFeedback(event) {
        const feedback = document.getElementById('touchFeedback');
        const rect = event.target.getBoundingClientRect();
        
        feedback.style.left = `${event.clientX - 30}px`;
        feedback.style.top = `${event.clientY - 30}px`;
        feedback.classList.add('active');
        
        setTimeout(() => {
            feedback.classList.remove('active');
        }, 300);
    }

    async fetchVideoInfo() {
        const url = document.getElementById('videoUrl').value.trim();
        
        if (!url) {
            this.showError('Please enter a video URL');
            this.vibrate(100);
            return;
        }

        if (!this.isValidUrl(url)) {
            this.showError('Please enter a valid video URL');
            this.vibrate(100);
            return;
        }

        this.setLoadingState(true);
        this.hideError();
        this.hideVideoInfo();

        try {
            const response = await fetch(`${this.apiBase}/video-info`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch video information');
            }

            this.displayVideoInfo(data.data);
            this.vibrate(50); // Success feedback
            
        } catch (error) {
            this.showError(this.getUserFriendlyError(error.message));
            this.vibrate(200); // Error feedback
        } finally {
            this.setLoadingState(false);
        }
    }

    displayVideoInfo(videoInfo) {
        // Update video details
        document.getElementById('videoTitle').textContent = videoInfo.title;
        document.getElementById('videoUploader').textContent = `By: ${videoInfo.uploader}`;
        document.getElementById('videoDuration').textContent = `⏱️ ${this.formatDuration(videoInfo.duration)}`;
        
        // Load thumbnail with error handling
        const thumbnail = document.getElementById('thumbnail');
        thumbnail.src = videoInfo.thumbnail;
        thumbnail.onerror = () => {
            thumbnail.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiNGM0Y0RjYiLz48dGV4dCB4PSIxMDAiIHk9IjYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCI+VGh1bWJuYWlsIG5vdCBhdmFpbGFibGU8L3RleHQ+PC9zdmc+';
        };

        // Display available formats
        this.displayFormats(videoInfo.formats);
        
        // Show video info section
        document.getElementById('videoInfo').classList.remove('hidden');
    }

    displayFormats(formats) {
        this.currentFormats = formats;
        const formatsContainer = document.getElementById('formatsList');
        formatsContainer.innerHTML = '';

        // Sort formats by quality (best first)
        const sortedFormats = formats.sort((a, b) => {
            const aRes = this.parseResolution(a.resolution);
            const bRes = this.parseResolution(b.resolution);
            return bRes - aRes;
        });

        sortedFormats.forEach(format => {
            const formatElement = this.createFormatElement(format);
            formatsContainer.appendChild(formatElement);
        });

        // Auto-select the best quality
        if (sortedFormats.length > 0) {
            this.selectFormat(sortedFormats[0], formatsContainer.firstChild);
        }
    }

    createFormatElement(format) {
        const div = document.createElement('div');
        div.className = 'format-item';
        div.innerHTML = `
            <div class="format-header">
                <span class="format-quality">${this.getQualityIcon(format.ext)} ${format.resolution}</span>
                <span class="format-size">${this.formatFileSize(format.filesize)}</span>
            </div>
            <div class="format-details">${format.format_note || `${format.ext.toUpperCase()} format`}</div>
        `;

        div.addEventListener('click', (e) => {
            this.showTouchFeedback(e);
            this.selectFormat(format, div);
        });
        
        return div;
    }

    selectFormat(format, element) {
        // Deselect all formats
        document.querySelectorAll('.format-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Select clicked format
        element.classList.add('selected');
        this.selectedFormat = format;

        // Show download button
        document.getElementById('downloadBtn').classList.remove('hidden');
        
        this.vibrate(50); // Selection feedback
    }

    async downloadVideo() {
        if (!this.selectedFormat) {
            this.showError('Please select a quality first');
            return;
        }

        const url = document.getElementById('videoUrl').value.trim();
        const videoTitle = document.getElementById('videoTitle').textContent;

        this.setDownloadState(true);

        try {
            const response = await fetch(`${this.apiBase}/download`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: url,
                    format_id: this.selectedFormat.format_id,
                    filename: this.sanitizeFilename(videoTitle)
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Download failed');
            }

            // Create blob from response and trigger download
            const blob = await response.blob();
            this.downloadBlob(blob, `${this.sanitizeFilename(videoTitle)}.${this.selectedFormat.ext}`);
            
            this.vibrate(100); // Success feedback
            
        } catch (error) {
            this.showError(this.getUserFriendlyError(error.message));
            this.vibrate(200); // Error feedback
        } finally {
            this.setDownloadState(false);
        }
    }

    downloadBlob(blob, filename) {
        if (this.isMobile && navigator.share) {
            // Use Web Share API on mobile if available
            const file = new File([blob], filename, { type: blob.type });
            navigator.share({
                files: [file],
                title: 'Downloaded Video'
            }).catch(() => {
                // Fallback to traditional download
                this.triggerTraditionalDownload(blob, filename);
            });
        } else {
            // Traditional download
            this.triggerTraditionalDownload(blob, filename);
        }
    }

    triggerTraditionalDownload(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    }

    // Utility methods
    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    formatDuration(seconds) {
        if (!seconds) return 'Unknown';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        }
        return `${minutes}m ${secs}s`;
    }

    formatFileSize(bytes) {
        if (!bytes) return 'Unknown';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    getQualityIcon(ext) {
        const icons = {
            'mp4': '🎬',
            'webm': '🌐',
            'mkv': '📹',
            'avi': '🎞️',
            'mov': '🎥'
        };
        return icons[ext] || '📄';
    }

    parseResolution(resolution) {
        const match = resolution.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    sanitizeFilename(filename) {
        return filename.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);
    }

    vibrate(duration) {
        if (navigator.vibrate) {
            navigator.vibrate(duration);
        }
    }

    getUserFriendlyError(error) {
        const errors = {
            'unable to extract video data': 'Video not found or private',
            'video is unavailable': 'Video is not available',
            'sign in to confirm': 'Age-restricted video',
            'copyright': 'Copyright restrictions'
        };
        
        return errors[error.toLowerCase()] || error;
    }

    // State management
    setLoadingState(loading) {
        const btn = document.getElementById('fetchInfoBtn');
        const btnText = btn.querySelector('.btn-text');
        const btnLoading = btn.querySelector('.btn-loading');
        
        btn.disabled = loading;
        document.getElementById('loading').classList.toggle('hidden', !loading);
        
        if (loading) {
            btnText.classList.add('hidden');
            btnLoading.classList.remove('hidden');
        } else {
            btnText.classList.remove('hidden');
            btnLoading.classList.add('hidden');
        }
    }

    setDownloadState(downloading) {
        const btn = document.getElementById('downloadBtn');
        btn.disabled = downloading;
        btn.textContent = downloading ? '⏳ Downloading...' : '📥 Download Selected Quality';
    }

    // Quick actions
    async pasteFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            if (text && this.isValidUrl(text)) {
                document.getElementById('videoUrl').value = text;
                this.vibrate(50);
            } else {
                this.showError('No valid URL in clipboard');
                this.vibrate(100);
            }
        } catch (error) {
            this.showError('Cannot access clipboard');
        }
    }

    clearInput() {
        document.getElementById('videoUrl').value = '';
        document.getElementById('videoUrl').focus();
        this.hideVideoInfo();
        this.hideError();
        this.vibrate(50);
    }

    hideVideoInfo() {
        document.getElementById('videoInfo').classList.add('hidden');
        document.getElementById('downloadBtn').classList.add('hidden');
    }

    hideError() {
        document.getElementById('errorMessage').classList.add('hidden');
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        
        // Auto-hide error after 5 seconds
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }

    handleAppBackground() {
        // Clean up when app goes to background
        this.setLoadingState(false);
        this.setDownloadState(false);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MobileVideoDownloader();
});

// Prevent zoom on double-tap
let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, { passive: false });