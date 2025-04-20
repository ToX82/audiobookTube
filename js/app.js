document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchResults = document.getElementById('search-results-container');
    const historyItems = document.getElementById('history-items');
    const historyEmptyMessage = document.getElementById('history-empty-message');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const darkIcon = document.querySelector('.dark-icon');
    const lightIcon = document.querySelector('.light-icon');

    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    const nowPlayingContainer = document.getElementById('now-playing-container');
    const nowPlayingTitle = document.getElementById('now-playing-title');
    const nowPlayingThumbnail = document.getElementById('now-playing-thumbnail');
    const currentTimeDisplay = document.getElementById('current-time');
    const durationDisplay = document.getElementById('duration');
    const progressBar = document.getElementById('progress-bar');
    const seekSlider = document.getElementById('seek-slider');

    const playPauseBtn = document.getElementById('play-pause-btn');
    const playbackSpeedSelect = document.getElementById('playback-speed');

    // Initialize theme
    function initTheme() {
        const currentTheme = storageManager.getTheme();
        if (currentTheme === 'light') {
            document.body.classList.add('light-theme');
            darkIcon.classList.add('hidden');
            lightIcon.classList.remove('hidden');
        } else {
            document.body.classList.remove('light-theme');
            darkIcon.classList.remove('hidden');
            lightIcon.classList.add('hidden');
        }
    }

    // Toggle theme
    themeToggleBtn.addEventListener('click', () => {
        const newTheme = storageManager.toggleTheme();
        if (newTheme === 'light') {
            document.body.classList.add('light-theme');
            darkIcon.classList.add('hidden');
            lightIcon.classList.remove('hidden');
        } else {
            document.body.classList.remove('light-theme');
            darkIcon.classList.remove('hidden');
            lightIcon.classList.add('hidden');
        }
    });

    // Initialize theme on load
    initTheme();

    // Initialize YouTube player
    audioPlayer.initialize().then(() => {
        console.log('AudioPlayer initialized');

        // Load history from storage
        updateHistoryView();
    });

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.id.replace('tab-', '');

            // Update button classes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Show correct content
            tabContents.forEach(content => content.classList.add('hidden'));

            if (tabId === 'search') {
                document.getElementById('search-results').classList.remove('hidden');
            } else if (tabId === 'history') {
                document.getElementById('history-container').classList.remove('hidden');
            }
        });
    });

    // Search functionality
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            performSearch();
        }
    });

    // Player controls
    playPauseBtn.addEventListener('click', () => {
        audioPlayer.togglePlayPause();
    });

    // Skip backward 5 seconds
    const skipBackward5Btn = document.getElementById('skip-backward-5-btn');
    skipBackward5Btn.addEventListener('click', () => {
        audioPlayer.skipBackward(5);
        updateProgressBarImmediate(5, false); // Immediate feedback
    });

    // Skip backward 30 seconds
    const skipBackward30Btn = document.getElementById('skip-backward-30-btn');
    skipBackward30Btn.addEventListener('click', () => {
        audioPlayer.skipBackward(30);
        updateProgressBarImmediate(30, false); // Immediate feedback
    });

    // Skip forward 5 seconds
    const skipForward5Btn = document.getElementById('skip-forward-5-btn');
    skipForward5Btn.addEventListener('click', () => {
        audioPlayer.skipForward(5);
        updateProgressBarImmediate(5, true); // Immediate feedback
    });

    // Skip forward 30 seconds
    const skipForward30Btn = document.getElementById('skip-forward-30-btn');
    skipForward30Btn.addEventListener('click', () => {
        audioPlayer.skipForward(30);
        updateProgressBarImmediate(30, true); // Immediate feedback
    });

    playbackSpeedSelect.addEventListener('change', () => {
        const speed = parseFloat(playbackSpeedSelect.value);
        audioPlayer.setPlaybackRate(speed);
    });

    // Function to immediately update progress bar for better UX feedback when skipping
    function updateProgressBarImmediate(seconds, forward) {
        if (!audioPlayer.currentTime || !audioPlayer.duration) {return;}

        // Calculate new position
        let newTime;
        if (forward) {
            newTime = Math.min(audioPlayer.currentTime + seconds, audioPlayer.duration);
        } else {
            newTime = Math.max(audioPlayer.currentTime - seconds, 0);
        }

        // Update displayed time and progress bar
        currentTimeDisplay.textContent = formatTime(newTime);
        const percent = audioPlayer.duration > 0 ? (newTime / audioPlayer.duration) * 100 : 0;
        progressBar.style.width = `${percent}%`;
        seekSlider.value = percent;
    }

    // Progress bar and seeking
    seekSlider.addEventListener('input', () => {
        const percent = seekSlider.value;
        progressBar.style.width = `${percent}%`;
    });

    seekSlider.addEventListener('change', () => {
        const percent = seekSlider.value;
        const seekTime = (percent / 100) * audioPlayer.duration;
        audioPlayer.seek(seekTime);
    });

    // Clear history button
    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear your history?')) {
            storageManager.clearHistory();
            updateHistoryView();
        }
    });

    // Player event listeners
    audioPlayer.onPlay(() => {
        playPauseBtn.innerHTML = '<i class="fas fa-pause text-xl"></i>';
        showNowPlaying();
    });

    audioPlayer.onPause(() => {
        playPauseBtn.innerHTML = '<i class="fas fa-play text-xl"></i>';
    });

    audioPlayer.onProgress((currentTime, duration) => {
        // Update time displays
        currentTimeDisplay.textContent = formatTime(currentTime);
        durationDisplay.textContent = formatTime(duration);

        // Update progress bar
        const percent = duration > 0 ? (currentTime / duration) * 100 : 0;
        progressBar.style.width = `${percent}%`;
        seekSlider.value = percent;

        // Save progress to storage every 5 seconds
        if (Math.floor(currentTime) % 5 === 0 && audioPlayer.currentVideo) {
            storageManager.saveVideoProgress(
                audioPlayer.currentVideo.videoId,
                currentTime,
                duration
            );
        }
    });

    // Search function
    function performSearch() {
        const query = searchInput.value.trim();
        if (!query) {return;}

        // Switch to search tab
        document.getElementById('tab-search').click();

        // Show loading state
        searchResults.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-spinner fa-spin text-blue-500 text-3xl"></i>
                <p class="mt-2 text-gray-400">Ricerca in corso...</p>
            </div>
        `;

        // Check if the input is a YouTube URL or video ID
        const videoId = youtubeSearchService.isYouTubeUrl(query);

        if (videoId) {
            // It's a URL or video ID, get the video details directly
            youtubeSearchService.getVideoDetails(videoId)
                .then(function(video) {
                    if (!video) {
                        throw new Error('Could not get video details');
                    }

                    // Display the single video
                    searchResults.innerHTML = '';
                    const videoItem = createVideoElement(video);
                    searchResults.appendChild(videoItem);

                    // Auto-play the video
                    playVideo(video);
                })
                .catch(function(error) {
                    console.error('Error getting video details:', error);
                    searchResults.innerHTML = `
                        <div class="text-center py-8 text-red-500">
                            <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                            <p>Errore nel recupero del video</p>
                            <p class="text-sm text-gray-500 mt-2">Il proxy CORS potrebbe essere bloccato</p>
                            <p class="text-sm mt-3">
                                <a href="https://cors-anywhere.herokuapp.com/corsdemo" target="_blank"
                                class="text-blue-400 underline" rel="noopener">
                                Clicca qui per sbloccare manualmente
                                </a>
                            </p>
                            <p class="text-sm text-gray-500 mt-2">Verifica anche che l'URL o l'ID di YouTube siano validi</p>
                        </div>
                    `;
                });
            return;
        }

        // If it's not a URL, perform a search
        youtubeSearchService.searchVideos(query)
            .then(function(results) {
                if (results.length === 0) {
                    searchResults.innerHTML = `
                        <div class="text-center py-8 text-gray-500">
                            <i class="fas fa-search text-2xl mb-2"></i>
                            <p>Nessun risultato trovato</p>
                        </div>
                    `;
                    return;
                }

                // Display results
                searchResults.innerHTML = '';
                results.forEach(function(video) {
                    const videoItem = createVideoElement(video);
                    searchResults.appendChild(videoItem);
                });
            })
            .catch(function(error) {
                console.error('Search error:', error);
                searchResults.innerHTML = `
                    <div class="text-center py-8 text-red-500">
                        <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                        <p>Servizio di ricerca non disponibile</p>
                        <p class="text-sm text-gray-500 mt-2">Il proxy CORS potrebbe essere bloccato</p>
                        <p class="text-sm mt-3">
                            <a href="https://cors-anywhere.herokuapp.com/corsdemo" target="_blank"
                            class="text-blue-400 underline" rel="noopener">
                            Clicca qui per sbloccare manualmente
                            </a>
                        </p>
                        <p class="text-sm text-gray-500 mt-2">In alternativa, prova a incollare direttamente un URL di YouTube</p>
                    </div>
                `;
            });
    }

    // Create video element for display
    function createVideoElement(video, includeAddButton = false, includeRemoveButton = false, isHistory = false) {
        const videoItem = document.createElement('div');
        videoItem.className = 'video-item flex items-center p-3 rounded-lg cursor-pointer';
        videoItem.dataset.videoId = video.videoId;

        // Check if this is the currently playing video
        if (audioPlayer.currentVideo && audioPlayer.currentVideo.videoId === video.videoId) {
            videoItem.classList.add('playing');
        }

        // Progress data
        const progress = storageManager.getVideoProgress(video.videoId);
        const progressPercent = progress ? progress.percent : 0;
        const progressDisplay = progressPercent > 0 && progressPercent < 100 ?
            `<div class="text-xs text-blue-400">${progressPercent.toFixed(0)}% played</div>` :
            '';

        // Format for history item
        let lastPlayedDisplay = '';
        if (isHistory && video.lastPlayed) {
            const lastPlayed = new Date(video.lastPlayed);
            lastPlayedDisplay = `<div class="text-xs text-gray-500">Last played: ${formatDate(lastPlayed)}</div>`;
        }

        videoItem.innerHTML = `
            <div class="thumbnail-container relative w-16 h-12 bg-gray-800 rounded overflow-hidden mr-3 flex-shrink-0">
                ${video.thumbnail ? `<img src="${video.thumbnail}" alt="" class="w-full h-full object-cover">` : ''}
                <div class="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                    <div class="h-full bg-blue-500" style="width: ${progressPercent}%"></div>
                </div>
            </div>
            <div class="flex-grow min-w-0">
                <div class="video-title font-medium text-sm sm:text-base truncate">${video.title}</div>
                <div class="text-xs text-gray-500 truncate">${video.author}</div>
                ${progressDisplay}
                ${lastPlayedDisplay}
            </div>
            <div class="ml-2 flex items-center">
                <span class="text-xs text-gray-400 mr-2 hidden sm:inline">${formatTime(video.lengthSeconds)}</span>
                ${isHistory ? `
                    <button class="remove-from-history-btn text-red-400 p-2" title="Remove from history">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        `;

        // Play video on click
        videoItem.addEventListener('click', (e) => {
            // Ignore if the click was on a button
            if (e.target.closest('button')) {
                return;
            }

            playVideo(video);
        });

        // Remove from history button
        if (isHistory) {
            const removeFromHistoryBtn = videoItem.querySelector('.remove-from-history-btn');
            if (removeFromHistoryBtn) {
                removeFromHistoryBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeFromHistory(video.videoId);
                });
            }
        }

        return videoItem;
    }

    // Play a video
    function playVideo(video) {
        // Play the video
        audioPlayer.loadVideo(video, true);

        // Update UI to show now playing
        showNowPlaying();
    }

    // Show now playing information
    function showNowPlaying() {
        if (!audioPlayer.currentVideo) {return;}

        nowPlayingContainer.classList.remove('hidden');
        nowPlayingTitle.textContent = audioPlayer.currentVideo.title;

        if (audioPlayer.currentVideo.thumbnail) {
            nowPlayingThumbnail.innerHTML = `<img src="${audioPlayer.currentVideo.thumbnail}" alt="" class="w-full h-full object-cover">`;
        } else {
            nowPlayingThumbnail.innerHTML = '';
        }

        // Update any video items in the lists
        document.querySelectorAll('.video-item').forEach(item => {
            item.classList.remove('playing');
            if (item.dataset.videoId === audioPlayer.currentVideo.videoId) {
                item.classList.add('playing');
            }
        });

        // Update history view
        updateHistoryView();
    }

    // Remove a video from history
    function removeFromHistory(videoId) {
        storageManager.removeFromHistory(videoId);
        updateHistoryView();
        showNotification('Removed from history');
    }

    // Update the history view
    function updateHistoryView() {
        const history = storageManager.getHistory();

        if (history.length === 0) {
            historyItems.innerHTML = '';
            historyEmptyMessage.classList.remove('hidden');
            return;
        }

        historyEmptyMessage.classList.add('hidden');
        historyItems.innerHTML = '';

        history.forEach(video => {
            const videoItem = createVideoElement(video, false, false, true);
            historyItems.appendChild(videoItem);
        });
    }

    // Show a notification
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `fixed bottom-24 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full text-white text-sm ${
            type === 'success' ? 'bg-green-500' : 'bg-yellow-500'
        } shadow-lg transition-opacity duration-300`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Fade out and remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('opacity-0');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Format time for display (seconds to MM:SS)
    function formatTime(seconds) {
        if (!seconds) {return '0:00';}

        seconds = Math.floor(seconds);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // Format date for display
    function formatDate(date) {
        if (!date) {return '';}

        const now = new Date();
        const diff = now - date;

        // Less than a day
        if (diff < 24 * 60 * 60 * 1000) {
            const hours = Math.floor(diff / (60 * 60 * 1000));

            if (hours < 1) {
                const minutes = Math.floor(diff / (60 * 1000));
                return minutes <= 1 ? 'Just now' : `${minutes} minutes ago`;
            }

            return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
        }

        // Less than a week
        if (diff < 7 * 24 * 60 * 60 * 1000) {
            const days = Math.floor(diff / (24 * 60 * 60 * 1000));
            return `${days} ${days === 1 ? 'day' : 'days'} ago`;
        }

        // Format as date
        return date.toLocaleDateString();
    }
});
