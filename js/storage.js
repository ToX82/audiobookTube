/**
 * Handles local storage operations for the AudioBookTube app
 */
class StorageManager {
    constructor() {
        this.PLAYLIST_KEY = 'audiobooktube_playlist';
        this.HISTORY_KEY = 'audiobooktube_history';
        this.PROGRESS_KEY = 'audiobooktube_progress';
        this.THEME_KEY = 'audiobooktube_theme';
        this.MAX_HISTORY_ITEMS = 50;
    }

    /**
     * Get current theme
     * @returns {String} Theme name ('dark' or 'light')
     */
    getTheme() {
        return localStorage.getItem(this.THEME_KEY) || 'dark';
    }

    /**
     * Save theme setting
     * @param {String} theme - Theme name ('dark' or 'light')
     * @returns {void}
     */
    saveTheme(theme) {
        localStorage.setItem(this.THEME_KEY, theme);
    }

    /**
     * Toggle between dark and light theme
     * @returns {String} New theme name
     */
    toggleTheme() {
        const currentTheme = this.getTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.saveTheme(newTheme);
        return newTheme;
    }

    /**
     * Get saved playlist
     * @returns {Array} Array of video objects
     */
    getPlaylist() {
        const playlist = localStorage.getItem(this.PLAYLIST_KEY);
        return playlist ? JSON.parse(playlist) : [];
    }

    /**
     * Save playlist
     * @param {Array} playlist - Array of video objects
     * @returns {void}
     */
    savePlaylist(playlist) {
        localStorage.setItem(this.PLAYLIST_KEY, JSON.stringify(playlist));
    }

    /**
     * Add a video to the playlist
     * @param {Object} video - Video object to add
     * @returns {void}
     */
    addToPlaylist(video) {
        const playlist = this.getPlaylist();

        // Check if video already exists in playlist
        const exists = playlist.some(item => item.videoId === video.videoId);
        if (exists) {
            return false;
        }

        playlist.push(video);
        this.savePlaylist(playlist);
        return true;
    }

    /**
     * Remove a video from the playlist
     * @param {String} videoId - YouTube video ID
     * @returns {void}
     */
    removeFromPlaylist(videoId) {
        const playlist = this.getPlaylist();
        const updatedPlaylist = playlist.filter(item => item.videoId !== videoId);
        this.savePlaylist(updatedPlaylist);
    }

    /**
     * Clear the entire playlist
     * @returns {void}
     */
    clearPlaylist() {
        localStorage.removeItem(this.PLAYLIST_KEY);
    }

    /**
     * Get watch history
     * @returns {Array} Array of video objects with lastPlayed dates
     */
    getHistory() {
        const history = localStorage.getItem(this.HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    }

    /**
     * Save watch history
     * @param {Array} history - Array of video objects
     * @returns {void}
     */
    saveHistory(history) {
        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    }

    /**
     * Add a video to watch history
     * @param {Object} video - Video object to add
     * @returns {void}
     */
    addToHistory(video) {
        let history = this.getHistory();

        // Remove if already exists
        history = history.filter(item => item.videoId !== video.videoId);

        // Add to the beginning
        history.unshift(Object.assign({}, video, {
            lastPlayed: new Date().toISOString()
        }));

        // Limit history size
        if (history.length > this.MAX_HISTORY_ITEMS) {
            history = history.slice(0, this.MAX_HISTORY_ITEMS);
        }

        this.saveHistory(history);
    }

    /**
     * Remove a video from the watch history
     * @param {String} videoId - YouTube video ID
     * @returns {void}
     */
    removeFromHistory(videoId) {
        const history = this.getHistory();
        const updatedHistory = history.filter(item => item.videoId !== videoId);
        this.saveHistory(updatedHistory);
    }

    /**
     * Clear the entire watch history
     * @returns {void}
     */
    clearHistory() {
        localStorage.removeItem(this.HISTORY_KEY);
    }

    /**
     * Save video progress
     * @param {String} videoId - YouTube video ID
     * @param {Number} currentTime - Current playback time in seconds
     * @param {Number} duration - Total duration in seconds
     * @returns {void}
     */
    saveVideoProgress(videoId, currentTime, duration) {
        const progressData = this.getAllProgress();
        progressData[videoId] = {
            currentTime,
            duration,
            percent: duration > 0 ? (currentTime / duration) * 100 : 0,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(progressData));
    }

    /**
     * Get progress for a specific video
     * @param {String} videoId - YouTube video ID
     * @returns {Object|null} Progress object or null if not found
     */
    getVideoProgress(videoId) {
        const progressData = this.getAllProgress();
        return progressData[videoId] || null;
    }

    /**
     * Get all video progress data
     * @returns {Object} Object with videoId keys and progress values
     */
    getAllProgress() {
        const progress = localStorage.getItem(this.PROGRESS_KEY);
        return progress ? JSON.parse(progress) : {};
    }

    /**
     * Clear progress for a specific video
     * @param {String} videoId - YouTube video ID
     * @returns {void}
     */
    clearVideoProgress(videoId) {
        const progressData = this.getAllProgress();
        if (progressData[videoId]) {
            delete progressData[videoId];
            localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(progressData));
        }
    }
}

// Create global instance
const storageManager = new StorageManager();
