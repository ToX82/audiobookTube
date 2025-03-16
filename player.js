/**
 * AudioPlayer Class
 * Manages YouTube audio playback with custom controls and history tracking
 */
class AudioPlayer {
    /**
     * Initialize the AudioPlayer with default settings and UI elements
     */
    constructor() {
        // Constants
        this.HISTORY_KEY = 'ytAudioHistory';
        this.MAX_HISTORY_ITEMS = 20;
        this.videoRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;
        this.SLIDER_THUMB_WIDTH = 16;

        // Player state
        this.player = null;
        this.currentVideoId = null;
        this.isPlaying = false;
        this.updateInterval = null;

        // Initialize components
        this.initElements();
        this.initEventListeners();
        this.initTheme();
        this.renderHistory();
    }

    /**
     * Initialize all DOM element references
     */
    initElements() {
        this.elements = {
            urlInput: document.getElementById('urlInput'),
            playerInterface: document.getElementById('playerInterface'),
            playPause: document.getElementById('playPause'),
            seekBar: document.getElementById('seekBar'),
            currentTime: document.getElementById('currentTime'),
            currentTitle: document.getElementById('currentTitle'),
            duration: document.getElementById('duration'),
            speed: document.getElementById('speed'),
            historySection: document.getElementById('historySection'),
            historyList: document.getElementById('historyList'),
            sliderTooltip: document.getElementById('sliderTooltip'),
            themeToggle: document.getElementById('themeToggle'),
            sunIcon: document.getElementById('sunIcon'),
            moonIcon: document.getElementById('moonIcon')
        };
    }

    /**
     * Configure all event listeners for player controls
     */
    initEventListeners() {
        this.elements.urlInput.addEventListener('input', this.handleUrlInput.bind(this));
        this.elements.urlInput.addEventListener('keypress', this.handleUrlEnter.bind(this));
        this.elements.playPause.addEventListener('click', this.togglePlay.bind(this));
        this.elements.seekBar.addEventListener('input', this.handleSeekInput.bind(this));
        this.elements.seekBar.addEventListener('mousemove', this.handleSeekHover.bind(this));
        this.elements.seekBar.addEventListener('mouseleave', this.handleSeekLeave.bind(this));
        this.elements.seekBar.addEventListener('change', this.handleSeekChange.bind(this));
        this.elements.speed.addEventListener('change', this.handleSpeedChange.bind(this));

        document.getElementById('skipBack').addEventListener('click', this.skipBack.bind(this));
        document.getElementById('skipForward').addEventListener('click', this.skipForward.bind(this));
        this.elements.themeToggle.addEventListener('click', this.toggleTheme.bind(this));
    }

    /**
     * Initialize theme based on saved preference
     */
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.classList.add(savedTheme);
        this.updateThemeIcons(savedTheme);
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const isDark = document.documentElement.classList.contains('dark');
        const newTheme = isDark ? 'light' : 'dark';

        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(newTheme);
        localStorage.setItem('theme', newTheme);

        this.updateThemeIcons(newTheme);
    }

    /**
     * Update theme icons based on current theme
     * @param {string} theme - The current theme ('light' or 'dark')
     */
    updateThemeIcons(theme) {
        this.elements.sunIcon.classList.toggle('hidden', theme !== 'light');
        this.elements.moonIcon.classList.toggle('hidden', theme !== 'dark');
    }

    /**
     * Create a new YouTube player instance
     * @param {string} videoId - YouTube video ID
     * @param {number|null} initialTime - Starting position in seconds
     */
    createPlayer(videoId, initialTime = null) {
        if (this.player) this.player.destroy();

        this.currentVideoId = videoId;
        this.player = new YT.Player('youtubePlayer', {
            videoId,
            playerVars: {
                autoplay: 1,
                controls: 0,
                modestbranding: 1,
                rel: 0,
                iv_load_policy: 3
            },
            events: {
                onReady: () => this.handlePlayerReady(initialTime),
                onStateChange: (event) => this.handlePlayerStateChange(event)
            }
        });
    }

    /**
     * Handle player ready event
     * @param {number|null} initialTime - Starting position in seconds
     */
    handlePlayerReady(initialTime) {
        const savedTime = initialTime || localStorage.getItem(this.currentVideoId) || 0;
        this.player.seekTo(savedTime);
        this.elements.playerInterface.classList.remove('hidden');
        this.updatePlayerState();

        const videoTitle = this.player.getVideoData().title;
        this.elements.currentTitle.textContent = videoTitle;
        this.updateHistory(videoTitle, savedTime, this.player.getDuration());
    }

    /**
     * Handle player state changes (play/pause)
     * @param {Object} event - YouTube player state change event
     */
    handlePlayerStateChange(event) {
        this.isPlaying = event.data === YT.PlayerState.PLAYING;
        this.elements.playPause.querySelector('iconify-icon').icon =
            this.isPlaying ? 'mdi:pause' : 'mdi:play';

        if (this.isPlaying) {
            this.updateInterval = setInterval(() => this.updatePlayerState(), 1000);
        } else {
            clearInterval(this.updateInterval);
            this.savePlaybackState();
        }
    }

    /**
     * Toggle play/pause state
     */
    togglePlay() {
        this.isPlaying ? this.player.pauseVideo() : this.player.playVideo();
    }

    /**
     * Skip backward 30 seconds
     */
    skipBack() {
        this.player.seekTo(this.player.getCurrentTime() - 30);
    }

    /**
     * Skip forward 30 seconds
     */
    skipForward() {
        this.player.seekTo(this.player.getCurrentTime() + 30);
    }

    /**
     * Handle playback speed change
     */
    handleSpeedChange() {
        this.player.setPlaybackRate(parseFloat(this.elements.speed.value));
    }

    /**
     * Handle seek bar input during drag
     * @param {Event} event - Input event
     */
    handleSeekInput(event) {
        const seekPercent = parseInt(event.target.value);
        const seekTime = this.calculateSeekTime(seekPercent);
        this.updateSliderTooltip(event, seekTime);
        this.elements.sliderTooltip.style.opacity = '1';
    }

    /**
     * Handle seek bar hover
     * @param {Event} event - Mouse event
     */
    handleSeekHover(event) {
        const seekTime = (event.offsetX / event.target.offsetWidth) * this.player.getDuration();
        this.updateSliderTooltip(event, seekTime);
        this.elements.sliderTooltip.style.opacity = '1';
    }

    /**
     * Handle mouse leaving seek bar
     */
    handleSeekLeave() {
        this.elements.sliderTooltip.style.opacity = '0';
    }

    /**
     * Handle seek bar change (after drag complete)
     * @param {Event} event - Change event
     */
    handleSeekChange(event) {
        if (!this.player) return;
        const seekPercent = parseInt(event.target.value);
        const seekTime = (seekPercent / 100) * this.player.getDuration();
        this.player.seekTo(seekTime);
        this.elements.sliderTooltip.style.opacity = '0';
    }

    /**
     * Calculate seek time from percentage
     * @param {number} seekPercent - Percentage of seek bar
     * @returns {number} Time in seconds
     */
    calculateSeekTime(seekPercent) {
        return (seekPercent / 100) * this.player.getDuration();
    }

    /**
     * Update slider tooltip position and content
     * @param {Event} event - Mouse or input event
     * @param {number} time - Time to display in tooltip
     */
    updateSliderTooltip(event, time) {
        const slider = event.target;
        const rect = slider.getBoundingClientRect();
        let position = event.type === 'mousemove' ?
            event.clientX - rect.left :
            (slider.value / slider.max) * rect.width;

        position = Math.max(this.SLIDER_THUMB_WIDTH/2, Math.min(position, rect.width - this.SLIDER_THUMB_WIDTH/2));
        this.elements.sliderTooltip.style.left = `${position}px`;
        this.elements.sliderTooltip.textContent = this.formatTime(time);
    }

    /**
     * Update player UI with current state
     */
    updatePlayerState() {
        const currentTime = this.player.getCurrentTime();
        const duration = this.player.getDuration();

        this.elements.currentTime.textContent = this.formatTime(currentTime);
        this.elements.duration.textContent = this.formatTime(duration);
        this.elements.seekBar.value = (currentTime / duration) * 100;

        this.savePlaybackState();
        this.updateHistory(
            this.player.getVideoData().title,
            currentTime,
            duration
        );
    }

    /**
     * Save current playback position to localStorage
     */
    savePlaybackState() {
        localStorage.setItem(this.currentVideoId, this.player.getCurrentTime());
        this.renderHistory();
    }

    /**
     * Update history with current video information
     * @param {string} videoTitle - Title of the video
     * @param {number} currentTime - Current playback position
     * @param {number} duration - Total video duration
     */
    updateHistory(videoTitle, currentTime, duration) {
        try {
            const history = JSON.parse(localStorage.getItem(this.HISTORY_KEY)) || [];
            const existingIndex = history.findIndex(item => item.id === this.currentVideoId);

            const newEntry = {
                id: this.currentVideoId,
                timestamp: currentTime,
                duration: duration,
                lastPlayed: Date.now(),
                thumbnail: `https://img.youtube.com/vi/${this.currentVideoId}/default.jpg`,
                title: videoTitle
            };

            if (existingIndex > -1) {
                history[existingIndex] = newEntry;
            } else {
                history.unshift(newEntry);
                if (history.length > this.MAX_HISTORY_ITEMS) history.pop();
            }

            localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
            this.renderHistory();
        } catch (error) {
            console.error('Error updating history:', error);
        }
    }

    /**
     * Render history items in the UI
     */
    renderHistory() {
        try {
            const history = JSON.parse(localStorage.getItem(this.HISTORY_KEY)) || [];
            const container = this.elements.historyList;
            const template = document.getElementById('historyItemTemplate');

            container.innerHTML = '';
            history.forEach(item => this.createHistoryItem(item, template));
            this.elements.historySection.classList.toggle('hidden', history.length === 0);
        } catch (error) {
            console.error('Error rendering history:', error);
        }
    }

    /**
     * Create a history item element
     * @param {Object} item - History item data
     * @param {HTMLTemplateElement} template - Template for history item
     */
    createHistoryItem(item, template) {
        const clone = template.content.cloneNode(true);
        const progressPercent = (item.timestamp / item.duration) * 100;
        const element = clone.querySelector('.group');

        if (item.id === this.currentVideoId) {
            element.classList.add('pulse-blue', 'border-l-4', 'border-primary-500');
            const indicator = element.querySelector('.play-indicator');
            indicator.classList.add('opacity-100', 'pulse-animation');
            indicator.querySelector('iconify-icon').setAttribute('icon', this.isPlaying ? 'mdi:pause' : 'mdi:play');
        }

        clone.querySelector('img').src = item.thumbnail;
        clone.querySelector('.video-title').textContent = item.title;
        clone.querySelector('.video-duration').textContent = this.formatTime(item.duration);
        clone.querySelector('.video-timestamp').textContent = this.formatTime(item.timestamp);
        clone.querySelector('.video-age').textContent = this.formatTimeAgo(item.lastPlayed);
        clone.querySelector('.progress-bar').style.width = `${progressPercent}%`;

        clone.querySelector('.group').addEventListener('click', () => {
            this.elements.urlInput.value = item.id;
            this.createPlayer(item.id, item.timestamp);
        });

        clone.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeFromHistory(item.id);
        });

        this.elements.historyList.appendChild(clone);
    }

    /**
     * Remove a video from history
     * @param {string} videoId - YouTube video ID to remove
     */
    removeFromHistory(videoId) {
        const history = JSON.parse(localStorage.getItem(this.HISTORY_KEY)) || [];
        const filtered = history.filter(item => item.id !== videoId);
        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(filtered));
        this.renderHistory();
    }

    /**
     * Validate URL input
     */
    handleUrlInput() {
        const isValid = this.videoRegex.test(this.elements.urlInput.value);
        this.elements.urlInput.classList.toggle('border-red-500', !isValid);
    }

    /**
     * Handle Enter key press in URL input
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleUrlEnter(e) {
        if (e.key === 'Enter') {
            const match = this.elements.urlInput.value.match(this.videoRegex);
            if (match) this.createPlayer(match[1]);
        }
    }

    /**
     * Format seconds into human-readable time
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time string (H:MM:SS or M:SS)
     */
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        return hours > 0 ?
            `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}` :
            `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Format timestamp into relative time
     * @param {number} timestamp - Unix timestamp
     * @returns {string} Relative time string (e.g., "5m fa")
     */
    formatTimeAgo(timestamp) {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d fa`;
        if (hours > 0) return `${hours}h fa`;
        if (minutes > 0) return `${minutes}m fa`;
        return 'Ora';
    }
}

/**
 * Initialize the application when the DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    new AudioPlayer();
});
