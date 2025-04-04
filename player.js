class AudioPlayer {
    constructor() {
        this.HISTORY_KEY = 'ytAudioHistory';
        this.MAX_HISTORY_ITEMS = 20;
        this.videoRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;
        this.SLIDER_THUMB_WIDTH = 16;

        this.player = null;
        this.currentVideoId = null;
        this.isPlaying = false;
        this.updateInterval = null;

        this.initElements();
        this.initEventListeners();
        this.initTheme();

        // Manteniamo renderHistory qui ma spostiamo updateHistorySectionVisibility
        // in DOMContentLoaded per assicurarsi che venga chiamato quando il DOM è pronto
        this.renderHistory();

        // Modificato per usare un listener persistente
        this.playVideoHandler = (e) => this.handlePlayVideo(e);
        document.addEventListener('playVideo', this.playVideoHandler);

        // Aggiunto listener per pulire l'interfaccia
        document.addEventListener('searchResultsCleared', (e) => {
            this.clearSearchResults();
            this.toggleSearchInterface(false);
        });
    }

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
            moonIcon: document.getElementById('moonIcon'),
            loadingOverlay: document.getElementById('loadingOverlay')
        };
    }

    initEventListeners() {
        this.elements.urlInput.addEventListener('input', this.handleUrlInput.bind(this));
        this.elements.urlInput.addEventListener('keypress', this.handleUrlEnter.bind(this));
        this.elements.playPause.addEventListener('click', this.togglePlay.bind(this));
        this.elements.seekBar.addEventListener('input', this.handleSeekInput.bind(this));
        this.elements.seekBar.addEventListener('mousemove', this.handleSeekHover.bind(this));
        this.elements.seekBar.addEventListener('mouseleave', this.handleSeekLeave.bind(this));
        this.elements.seekBar.addEventListener('change', this.handleSeekChange.bind(this));
        this.elements.speed.addEventListener('change', this.handleSpeedChange.bind(this));

        document.getElementById('skipBack30').addEventListener('click', () => this.skipTime(-30));
        document.getElementById('skipForward30').addEventListener('click', () => this.skipTime(30));
        document.getElementById('skipBack5').addEventListener('click', () => this.skipTime(-5));
        document.getElementById('skipForward5').addEventListener('click', () => this.skipTime(5));
        this.elements.themeToggle.addEventListener('click', this.toggleTheme.bind(this));

        document.getElementById('clearHistory').addEventListener('click', () => {
            localStorage.removeItem(this.HISTORY_KEY);
            this.renderHistory();
        });

        // Mobile touch gestures
        let touchStartX = 0;
        this.elements.seekBar.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        });

        this.elements.seekBar.addEventListener('touchend', (e) => {
            const deltaX = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(deltaX) > 30) {
                this.player.seekTo(this.player.getCurrentTime() + (deltaX > 0 ? 30 : -30));
            }
        });
    }

    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(savedTheme);
        this.updateThemeIcons(savedTheme);
    }

    toggleTheme() {
        const isDark = document.documentElement.classList.contains('dark');
        const newTheme = isDark ? 'light' : 'dark';

        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcons(newTheme);
    }

    updateThemeIcons(theme) {
        this.elements.sunIcon.classList.toggle('hidden', theme !== 'light');
        this.elements.moonIcon.classList.toggle('hidden', theme !== 'dark');
    }

    createPlayer(videoId, initialTime = null) {
        this.elements.loadingOverlay.classList.remove('hidden');

        if (this.player) {
            this.player.destroy();
        }

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

    handlePlayerReady(initialTime) {
        const savedTime = initialTime || localStorage.getItem(this.currentVideoId) || 0;
        this.player.seekTo(savedTime);
        this.elements.playerInterface.classList.remove('hidden');
        this.elements.loadingOverlay.classList.add('hidden');
        this.updatePlayerState();

        const videoTitle = this.player.getVideoData().title;
        this.updateHistory(videoTitle, savedTime, this.player.getDuration());
        this.elements.urlInput.classList.remove('opacity-50', 'cursor-wait');
    }

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

    togglePlay() {
        this.isPlaying ? this.player.pauseVideo() : this.player.playVideo();
    }

    /**
     * Salta avanti o indietro nel video di un numero specificato di secondi
     *
     * @param {number} seconds - Numero di secondi (positivo per avanzare, negativo per tornare indietro)
     * @returns {void}
     */
    skipTime(seconds) {
        if (this.player) {
            this.player.seekTo(this.player.getCurrentTime() + seconds);
        }
    }

    handleSpeedChange() {
        this.player.setPlaybackRate(parseFloat(this.elements.speed.value));
    }

    handleSeekInput(event) {
        const seekPercent = parseInt(event.target.value);
        const seekTime = this.calculateSeekTime(seekPercent);
        this.updateSliderTooltip(event, seekTime);
        this.elements.sliderTooltip.style.opacity = '1';
    }

    handleSeekHover(event) {
        const seekTime = (event.offsetX / event.target.offsetWidth) * this.player.getDuration();
        this.updateSliderTooltip(event, seekTime);
        this.elements.sliderTooltip.style.opacity = '1';
    }

    handleSeekLeave() {
        this.elements.sliderTooltip.style.opacity = '0';
    }

    handleSeekChange(event) {
        if (!this.player) {
            return;
        }
        const seekPercent = parseInt(event.target.value);
        const seekTime = (seekPercent / 100) * this.player.getDuration();
        this.player.seekTo(seekTime);
        this.elements.sliderTooltip.style.opacity = '0';
    }

    calculateSeekTime(seekPercent) {
        return (seekPercent / 100) * this.player.getDuration();
    }

    updateSliderTooltip(event, time) {
        const slider = event.target;
        const rect = slider.getBoundingClientRect();
        let position = event.type === 'mousemove' ?
            event.clientX - rect.left :
            (slider.value / slider.max) * rect.width;

        position = Math.max(this.SLIDER_THUMB_WIDTH / 2, Math.min(position, rect.width - this.SLIDER_THUMB_WIDTH / 2));
        this.elements.sliderTooltip.style.left = `${position}px`;
        this.elements.sliderTooltip.textContent = this.formatTime(time);
    }

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

    savePlaybackState() {
        localStorage.setItem(this.currentVideoId, this.player.getCurrentTime());
        this.renderHistory();
    }

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
                if (history.length > this.MAX_HISTORY_ITEMS) {
                    history.pop();
                }
            }

            localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
            this.renderHistory();
        } catch (error) {
            console.error('Error updating history:', error);
        }
    }

    renderHistory() {
        try {
            const history = JSON.parse(localStorage.getItem(this.HISTORY_KEY)) || [];
            const container = this.elements.historyList;
            const template = document.getElementById('historyItemTemplate');

            container.innerHTML = '';
            history.forEach(item => this.createHistoryItem(item, template));

            // Aggiorna la visibilità della sezione history
            this.updateHistorySectionVisibility();
        } catch (error) {
            console.error('Error rendering history:', error);
        }
    }

    createHistoryItem(item, template) {
        const clone = template.content.cloneNode(true);
        const progressPercent = (item.timestamp / item.duration) * 100;
        const element = clone.querySelector('.group');

        if (item.id === this.currentVideoId) {
            element.classList.add('border-l-4', 'border-primary-500');
            const indicator = element.querySelector('.play-indicator');
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

    removeFromHistory(videoId) {
        const history = JSON.parse(localStorage.getItem(this.HISTORY_KEY)) || [];
        const filtered = history.filter(item => item.id !== videoId);
        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(filtered));
        this.renderHistory();
    }

    handleUrlInput() {
        const isValid = this.videoRegex.test(this.elements.urlInput.value);
        this.elements.urlInput.classList.toggle('border-red-500', !isValid);
    }

    handleUrlEnter(e) {
        if (e.key === 'Enter') {
            const match = this.elements.urlInput.value.match(this.videoRegex);
            if (match) {
                this.createPlayer(match[1]);
            } else {
                document.getElementById('urlError').classList.remove('hidden');
                setTimeout(() => document.getElementById('urlError').classList.add('hidden'), 2000);
            }
        }
    }

    /**
     * Formatta il tempo in formato leggibile (mm:ss o hh:mm:ss)
     *
     * @param {number} seconds - Il tempo in secondi
     * @returns {string} - Il tempo formattato
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
     * Formatta il tempo trascorso in un formato leggibile (ora, minuti, giorni fa)
     *
     * @param {number} timestamp - Il timestamp in millisecondi
     * @returns {string} - La stringa formattata del tempo trascorso
     */
    formatTimeAgo(timestamp) {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ago`;
        }
        if (hours > 0) {
            return `${hours}h ago`;
        }
        if (minutes > 0) {
            return `${minutes}m ago`;
        }
        return 'Now';
    }

    /**
     * Gestisce l'evento playVideo
     *
     * @param {Event} e - L'evento playVideo
     * @returns {void}
     */
    handlePlayVideo(e) {
        this.toggleSearchInterface(false);
        this.createPlayer(e.detail.videoId);
    }

    /**
     * Rimuove i listener e pulisce le risorse
     *
     * @returns {void}
     */
    destroy() {
        document.removeEventListener('playVideo', this.playVideoHandler);
    }

    /**
     * Mostra o nasconde l'interfaccia di ricerca
     *
     * @param {boolean} show - Se mostrare l'interfaccia
     * @returns {void}
     */
    toggleSearchInterface(show = true) {
        const searchContainer = document.getElementById('searchContainer');
        const mainInterface = document.getElementById('mainInterface');
        const searchInput = document.getElementById('searchInput');

        if (searchContainer && mainInterface) {
            if (show) {
                searchContainer.classList.remove('hidden');
                mainInterface.classList.add('hidden');
            } else {
                if (searchInput) {
                    searchInput.value = '';
                }
                searchContainer.classList.add('hidden');
                mainInterface.classList.remove('hidden');
            }
        }
    }

    /**
     * Pulisce i risultati di ricerca dall'interfaccia
     *
     * @returns {void}
     */
    clearSearchResults() {
        console.log('AudioPlayer: pulizia risultati');

        // 1. Rimuovi tutti gli elementi con data-video-id (risultati di ricerca)
        document.querySelectorAll('[data-video-id]').forEach(el => {
            console.log('Rimozione elemento:', el);
            el.remove();
        });

        // 2. Nascondi qualsiasi contenitore di risultati
        const possibleContainers = [
            '.search-results',
            '#searchResults',
            '#searchContainer',
            '.results-container',
            '[role="search"]',
            '.search-wrapper'
        ];

        possibleContainers.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            console.log(`Trovati ${elements.length} elementi per ${selector}`);
            elements.forEach(el => {
                el.style.display = 'none';
                el.classList.add('hidden');
                // Svuota il contenuto
                el.innerHTML = '';
            });
        });

        // 3. Forza un refresh del layout
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
    }

    /**
     * Initialize the audio player with default settings
     *
     * @returns {HTMLElement} - The configured player element
     */
    initializePlayer() {
        const player = document.getElementById('audioPlayer');
        this.configurePlayerSettings(player);
        this.setupPlayerEvents(player);
        this.setupVolumeControls(player);
        this.setupPlaylistControls(player);
        return player;
    }

    /**
     * Configure player with saved settings
     *
     * @param {HTMLElement} player - The audio player element
     * @returns {void}
     */
    configurePlayerSettings(player) {
        player.autoplay = localStorage.getItem('autoplay') === 'true';
        player.volume = parseFloat(localStorage.getItem('volume') || 0.5);
    }

    /**
     * Setup all player event listeners
     *
     * @param {HTMLElement} player - The audio player element
     * @returns {void}
     */
    setupPlayerEvents(player) {
        player.addEventListener('play', function() {
            this.togglePlayPauseButtons(true);
            this.updateNowPlaying();
        }.bind(this));

        player.addEventListener('pause', function() {
            this.togglePlayPauseButtons(false);
        }.bind(this));

        // Altri event listener...
    }

    /**
     * Toggle play/pause button visibility
     *
     * @param {boolean} isPlaying - Whether audio is playing
     * @returns {void}
     */
    togglePlayPauseButtons(isPlaying) {
        document.querySelector('.play-button').classList.toggle('hidden', isPlaying);
        document.querySelector('.pause-button').classList.toggle('hidden', !isPlaying);
    }

    /**
     * Setup volume control event listeners
     *
     * @param {HTMLElement} player - The audio player element
     * @returns {void}
     */
    setupVolumeControls(player) {
        document.querySelector('.volume-up').addEventListener('click', function() {
            this.adjustVolume(player, 0.1);
        }.bind(this));

        document.querySelector('.volume-down').addEventListener('click', function() {
            this.adjustVolume(player, -0.1);
        }.bind(this));
    }

    /**
     * Adjust player volume and save setting
     *
     * @param {HTMLElement} player - The audio player element
     * @param {number} delta - Amount to adjust volume
     * @returns {void}
     */
    adjustVolume(player, delta) {
        let newVolume = player.volume + delta;
        newVolume = Math.min(1, Math.max(0, newVolume));

        player.volume = newVolume;
        localStorage.setItem('volume', newVolume);
    }

    /**
     * Setup playlist control event listeners
     *
     * @param {HTMLElement} player - The audio player element
     * @returns {void}
     */
    setupPlaylistControls(player) {
        // Implementazione gestione playlist
    }

    /**
     * Aggiorna la visibilità della sezione history in base alla presenza di elementi
     *
     * @returns {void}
     */
    updateHistorySectionVisibility() {
        try {
            const history = JSON.parse(localStorage.getItem(this.HISTORY_KEY)) || [];

            if (history.length === 0) {
                if (this.elements.historySection) {
                    this.elements.historySection.classList.add('hidden');
                }
            } else {
                if (this.elements.historySection) {
                    this.elements.historySection.classList.remove('hidden');
                    this.ensureHistorySectionVisible();
                }
            }
        } catch (error) {
            console.error('Error updating history visibility:', error);
            if (this.elements.historySection) {
                this.elements.historySection.classList.add('hidden');
            }
        }
    }

    /**
     * Assicura che la sezione history sia visibile controllando anche i genitori
     *
     * @returns {void}
     */
    ensureHistorySectionVisible() {
        try {
            const historySection = document.getElementById('historySection');
            if (!historySection) {
                return;
            }

            historySection.classList.remove('hidden');
            historySection.style.display = 'block';

            // Assicuriamoci che nessun genitore abbia hidden
            let parent = historySection.parentElement;
            while (parent) {
                parent.classList.remove('hidden');
                parent = parent.parentElement;
            }

            // Forziamo un reflow del DOM
            void historySection.offsetHeight;
        } catch (error) {
            console.error('Error ensuring history section visibility:', error);
        }
    }
}

// Esporta la classe AudioPlayer per i test
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AudioPlayer };
}

// Variabile globale per l'istanza di AudioPlayer
let audioPlayerInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // Salvo l'istanza in una variabile globale
    audioPlayerInstance = new AudioPlayer();

    // Assicuriamoci che la history sia visibile dopo il caricamento completo del DOM
    setTimeout(() => {
        try {
            const history = JSON.parse(localStorage.getItem(audioPlayerInstance.HISTORY_KEY)) || [];

            if (history.length > 0) {
                const historySection = document.getElementById('historySection');
                if (historySection) {
                    historySection.classList.remove('hidden');
                    historySection.style.display = 'block';
                }

                // Forziamo anche un refresh della UI
                audioPlayerInstance.renderHistory();
                audioPlayerInstance.ensureHistorySectionVisible();
            }
        } catch (error) {
            console.error('Error in delayed history check:', error);
        }
    }, 300);
});
