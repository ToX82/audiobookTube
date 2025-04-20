/**
 * Handles YouTube player integration and audio playback
 */
class AudioPlayer {
    constructor() {
        this.player = null;
        this.currentVideo = null;
        this.playbackRate = 1;
        this.isReady = false;
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;
        this.progressInterval = null;
        this.playlist = [];
        this.currentPlaylistIndex = -1;

        // Event callbacks
        this.onPlayCallback = null;
        this.onPauseCallback = null;
        this.onEndedCallback = null;
        this.onProgressCallback = null;
        this.onStateChangeCallback = null;
    }

    /**
     * Initialize the YouTube player
     * @returns {Promise} Promise that resolves when player is ready
     */
    initialize() {
        return new Promise((resolve) => {
            if (window.YT && window.YT.Player) {
                this._setupPlayer();
                resolve();
            } else {
                // YouTube API not loaded yet, wait for it
                window.onYouTubeIframeAPIReady = () => {
                    this._setupPlayer();
                    resolve();
                };
            }
        });
    }

    /**
     * Set up the YouTube player instance
     * @private
     * @returns {void}
     */
    _setupPlayer() {
        this.player = new YT.Player('youtube-player', {
            height: '0',
            width: '0',
            playerVars: {
                'playsinline': 1,
                'controls': 0,
                'disablekb': 1,
                'rel': 0
            },
            events: {
                'onReady': this._onPlayerReady.bind(this),
                'onStateChange': this._onPlayerStateChange.bind(this),
                'onError': this._onPlayerError.bind(this)
            }
        });
    }

    /**
     * Handle player ready event
     * @private
     * @returns {void}
     */
    _onPlayerReady() {
        console.log('YouTube player is ready');
        this.isReady = true;
    }

    /**
     * Handle player state change events
     * @param {Object} event - YouTube player state change event
     * @private
     * @returns {void}
     */
    _onPlayerStateChange(event) {
        switch (event.data) {
            case YT.PlayerState.ENDED:
                this.isPlaying = false;
                this._clearProgressInterval();

                // Save final progress
                if (this.currentVideo) {
                    storageManager.saveVideoProgress(
                        this.currentVideo.videoId,
                        this.duration,
                        this.duration
                    );
                }

                if (this.onEndedCallback) {
                    this.onEndedCallback();
                }
                break;

            case YT.PlayerState.PLAYING:
                this.isPlaying = true;
                this.duration = this.player.getDuration();
                this._startProgressInterval();

                if (this.onPlayCallback) {
                    this.onPlayCallback();
                }
                break;

            case YT.PlayerState.PAUSED:
                this.isPlaying = false;
                this._clearProgressInterval();

                // Save current progress
                if (this.currentVideo) {
                    storageManager.saveVideoProgress(
                        this.currentVideo.videoId,
                        this.currentTime,
                        this.duration
                    );
                }

                if (this.onPauseCallback) {
                    this.onPauseCallback();
                }
                break;
        }

        if (this.onStateChangeCallback) {
            this.onStateChangeCallback(event.data);
        }
    }

    /**
     * Handle player errors
     * @param {Object} event - YouTube player error event
     * @private
     * @returns {void}
     */
    _onPlayerError(event) {
        console.error('YouTube player error:', event.data);

        // Common error codes:
        // 2 – The request contains an invalid parameter value.
        // 5 – The requested content cannot be played in an HTML5 player.
        // 100 – The video requested was not found.
        // 101/150 – The owner of the requested video does not allow it to be played in embedded players.

        let errorMessage = 'An error occurred while playing the video.';

        switch (event.data) {
            case 100:
                errorMessage = 'The requested video was not found.';
                break;
            case 101:
            case 150:
                errorMessage = 'The video owner does not allow embedding.';
                break;
        }

        alert(errorMessage);
    }

    /**
     * Start interval to track playback progress
     * @private
     * @returns {void}
     */
    _startProgressInterval() {
        this._clearProgressInterval();
        this.progressInterval = setInterval(() => {
            if (this.isPlaying && this.player) {
                this.currentTime = this.player.getCurrentTime();

                if (this.onProgressCallback) {
                    this.onProgressCallback(this.currentTime, this.duration);
                }
            }
        }, 1000);
    }

    /**
     * Clear progress tracking interval
     * @private
     * @returns {void}
     */
    _clearProgressInterval() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    /**
     * Load a video to the player
     * @param {Object} video - Video object with videoId
     * @param {Boolean} autoplay - Whether to play automatically
     * @returns {void}
     */
    loadVideo(video, autoplay = true) {
        if (!this.isReady || !this.player) {
            console.warn('Player not ready yet');
            return;
        }

        this.currentVideo = video;

        // Get saved progress if available
        const progress = storageManager.getVideoProgress(video.videoId);
        const startTime = progress ? progress.currentTime : 0;

        if (autoplay) {
            this.player.loadVideoById({
                videoId: video.videoId,
                startSeconds: startTime
            });
        } else {
            this.player.cueVideoById({
                videoId: video.videoId,
                startSeconds: startTime
            });
        }

        // If the video has generic title/author, update it with actual YouTube data after loading
        if (video.title === 'YouTube Video' && video.author === 'Unknown') {
            // Set a timeout to get the video data from the player once it's loaded
            setTimeout(() => {
                if (this.player && this.player.getVideoData) {
                    const videoData = this.player.getVideoData();
                    if (videoData && videoData.title) {
                        this.currentVideo.title = videoData.title;
                        this.currentVideo.author = videoData.author || 'YouTube Creator';

                        // Update the now playing display
                        if (typeof showNowPlaying === 'function') {
                            showNowPlaying();
                        }

                        // Also update in storage
                        storageManager.addToHistory(this.currentVideo);
                    }
                }
            }, 1000); // Wait a second for the video to load
        }

        // Add to history
        storageManager.addToHistory(video);
    }

    /**
     * Play current video
     * @returns {void}
     */
    play() {
        if (this.isReady && this.player) {
            this.player.playVideo();
        }
    }

    /**
     * Pause current video
     * @returns {void}
     */
    pause() {
        if (this.isReady && this.player) {
            this.player.pauseVideo();
        }
    }

    /**
     * Toggle play/pause state
     * @returns {boolean} True if playing, false if paused
     */
    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * Seek to specific time in the video
     * @param {Number} seconds - Time in seconds to seek to
     * @returns {void}
     */
    seek(seconds) {
        if (this.isReady && this.player) {
            this.player.seekTo(seconds, true);
        }
    }

    /**
     * Set the playback rate
     * @param {Number} rate - Playback rate (0.5 to 2)
     * @returns {void}
     */
    setPlaybackRate(rate) {
        if (this.isReady && this.player) {
            this.playbackRate = rate;
            this.player.setPlaybackRate(rate);
        }
    }

    /**
     * Skip forward by specified seconds
     * @param {Number} seconds - Seconds to skip forward (default: 30)
     * @returns {void}
     */
    skipForward(seconds = 30) {
        if (this.isReady && this.player) {
            const newTime = Math.min(this.currentTime + seconds, this.duration);
            this.seek(newTime);
        }
    }

    /**
     * Skip backward by specified seconds
     * @param {Number} seconds - Seconds to skip backward (default: 10)
     * @returns {void}
     */
    skipBackward(seconds = 10) {
        if (this.isReady && this.player) {
            const newTime = Math.max(this.currentTime - seconds, 0);
            this.seek(newTime);
        }
    }

    /**
     * Set current playlist and start playing from a specific index
     * @param {Array} playlist - Array of video objects
     * @param {Number} startIndex - Index to start playing from
     * @returns {void}
     */
    setPlaylist(playlist, startIndex = 0) {
        this.playlist = [ ...playlist ];
        this.currentPlaylistIndex = startIndex;

        if (this.playlist.length > 0 && this.currentPlaylistIndex < this.playlist.length) {
            const video = this.playlist[this.currentPlaylistIndex];
            this.loadVideo(video, true);
        }
    }

    /**
     * Set callback for play event
     * @param {Function} callback - Function to call on play
     * @returns {void}
     */
    onPlay(callback) {
        this.onPlayCallback = callback;
    }

    /**
     * Set callback for pause event
     * @param {Function} callback - Function to call on pause
     * @returns {void}
     */
    onPause(callback) {
        this.onPauseCallback = callback;
    }

    /**
     * Set callback for video ended event
     * @param {Function} callback - Function to call when video ends
     * @returns {void}
     */
    onEnded(callback) {
        this.onEndedCallback = callback;
    }

    /**
     * Set callback for progress update
     * @param {Function} callback - Function to call on progress update
     * @returns {void}
     */
    onProgress(callback) {
        this.onProgressCallback = callback;
    }

    /**
     * Set callback for YouTube player state change
     * @param {Function} callback - Function to call on state change
     * @returns {void}
     */
    onStateChange(callback) {
        this.onStateChangeCallback = callback;
    }
}

// Create global instance
const audioPlayer = new AudioPlayer();
