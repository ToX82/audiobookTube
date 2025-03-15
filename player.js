const HISTORY_KEY = 'ytAudioHistory';
const MAX_HISTORY_ITEMS = 20;
const videoRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;

let player;
let currentVideoId = null;
let isPlaying = false;
let updateInterval;

const elements = {
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
    sliderTooltip: document.getElementById('sliderTooltip')
};

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(savedTheme);

    document.getElementById('sunIcon').classList.toggle('hidden', savedTheme !== 'light');
    document.getElementById('moonIcon').classList.toggle('hidden', savedTheme !== 'dark');
}

document.getElementById('themeToggle').addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';

    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(newTheme);

    localStorage.setItem('theme', newTheme);
    document.getElementById('sunIcon').classList.toggle('hidden');
    document.getElementById('moonIcon').classList.toggle('hidden');
});

// Time Formatting
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Format relative time display
function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    // Convert to seconds, minutes, hours
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}d ago`;
    } else if (hours > 0) {
        return `${hours}h ago`;
    } else if (minutes > 0) {
        return `${minutes}m ago`;
    } else {
        return 'Just now';
    }
}

// History Management
function updateHistory(videoId, videoTitle, currentTime, duration) {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    const existingIndex = history.findIndex(item => item.id === videoId);

    const newEntry = {
        id: videoId,
        title: videoTitle,
        timestamp: currentTime,
        duration: duration,
        lastPlayed: Date.now(),
        thumbnail: `https://img.youtube.com/vi/${videoId}/default.jpg`
    };

    if (existingIndex > -1) {
        history[existingIndex] = newEntry;
    } else {
        history.unshift(newEntry);
        if (history.length > MAX_HISTORY_ITEMS) history.pop();
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    const container = elements.historyList;
    const template = document.getElementById('historyItemTemplate');

    container.innerHTML = '';
    history.forEach(item => {
        const clone = template.content.cloneNode(true);
        const progressPercent = (item.timestamp / item.duration) * 100;
        const element = clone.querySelector('.group');

        // Se questo è il video attualmente in riproduzione, aggiungiamo le classi appropriate
        if (item.id === currentVideoId) {
            element.classList.add('pulse-blue', 'border-l-4', 'border-primary-500');
            element.querySelector('.play-indicator').classList.add('opacity-100', 'pulse-animation');
            element.querySelector('.play-indicator').classList.remove('opacity-0');
            element.querySelector('.play-indicator iconify-icon').setAttribute('icon', isPlaying ? 'mdi:pause' : 'mdi:play');
        }

        clone.querySelector('img').src = item.thumbnail;
        clone.querySelector('.video-title').textContent = item.title;
        clone.querySelector('.video-duration').textContent = formatTime(item.duration);
        clone.querySelector('.video-timestamp').textContent = formatTime(item.timestamp);
        clone.querySelector('.video-age').textContent = formatTimeAgo(item.lastPlayed);
        clone.querySelector('.progress-bar').style.width = `${progressPercent}%`;

        clone.querySelector('.group').addEventListener('click', () => {
            elements.urlInput.value = item.id;
            createPlayer(item.id, item.timestamp);
        });

        clone.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromHistory(item.id);
        });

        container.appendChild(clone);
    });

    elements.historySection.classList.toggle('hidden', history.length === 0);
}

function removeFromHistory(videoId) {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    const filtered = history.filter(item => item.id !== videoId);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
    renderHistory();
}

// Player Controls
function createPlayer(videoId, initialTime = null) {
    if (player) player.destroy();

    currentVideoId = videoId;
    player = new YT.Player('youtubePlayer', {
        videoId,
        playerVars: {
            autoplay: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3
        },
        events: {
            onReady: () => {
                const savedTime = initialTime || localStorage.getItem(videoId) || 0;
                player.seekTo(savedTime);
                player.playVideo();
                elements.playerInterface.classList.remove('hidden');
                updatePlayerState();

                const videoTitle = player.getVideoData().title;
                elements.currentTitle.textContent = videoTitle;
                updateHistory(videoId, videoTitle, savedTime, player.getDuration());
            },
            onStateChange: (event) => {
                isPlaying = event.data === YT.PlayerState.PLAYING;
                elements.playPause.querySelector('iconify-icon').icon =
                    isPlaying ? 'mdi:pause' : 'mdi:play';

                // Aggiorna anche l'icona nell'elemento della cronologia
                renderHistory();

                if (isPlaying) {
                    updateInterval = setInterval(updatePlayerState, 1000);
                } else {
                    clearInterval(updateInterval);
                    localStorage.setItem(videoId, player.getCurrentTime());
                    const videoTitle = player.getVideoData().title;
                    updateHistory(videoId, videoTitle, player.getCurrentTime(), player.getDuration());
                }
            }
        }
    });
}

function updatePlayerState() {
    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();

    elements.currentTime.textContent = formatTime(currentTime);
    elements.duration.textContent = formatTime(duration);
    elements.seekBar.value = (currentTime / duration) * 100;

    localStorage.setItem(currentVideoId, currentTime);
    const videoTitle = player.getVideoData().title;
    updateHistory(currentVideoId, videoTitle, currentTime, duration);
}

// Event Listeners
elements.urlInput.addEventListener('input', () => {
    const isValid = videoRegex.test(elements.urlInput.value);
    elements.urlInput.classList.toggle('border-red-500', !isValid);
});

elements.urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const match = elements.urlInput.value.match(videoRegex);
        if (match) createPlayer(match[1]);
    }
});

elements.playPause.addEventListener('click', () => {
    isPlaying ? player.pauseVideo() : player.playVideo();
});

// Gestione aggiornamento tempo durante il trascinamento
elements.seekBar.addEventListener('input', (e) => {
    if (!player) return;

    const seekPercent = parseInt(e.target.value);
    const duration = player.getDuration();
    const seekTime = (seekPercent / 100) * duration;

    // Aggiorna l'indicatore di tempo in tempo reale
    elements.currentTime.textContent = formatTime(seekTime);

    // Aggiorna e mostra il tooltip
    updateSliderTooltip(e, seekTime);
    elements.sliderTooltip.style.opacity = '1';
});

elements.seekBar.addEventListener('mousemove', (e) => {
    if (!player) return;

    const rect = e.target.getBoundingClientRect();
    const position = ((e.clientX - rect.left) / rect.width);
    const seekTime = position * player.getDuration();

    // Aggiorna il tooltip durante il movimento del mouse
    updateSliderTooltip(e, seekTime);
    elements.sliderTooltip.style.opacity = '1';
});

elements.seekBar.addEventListener('mouseleave', () => {
    elements.sliderTooltip.style.opacity = '0';
});

elements.seekBar.addEventListener('change', (e) => {
    if (!player) return;

    const seekPercent = parseInt(e.target.value);
    const duration = player.getDuration();
    const seekTime = (seekPercent / 100) * duration;

    // Imposta la posizione nel player
    player.seekTo(seekTime);
    elements.sliderTooltip.style.opacity = '0';
});

function updateSliderTooltip(event, time) {
    const slider = event.target;
    const rect = slider.getBoundingClientRect();
    const thumbWidth = 16; // Larghezza del thumb dello slider

    // Calcola la posizione del tooltip
    let position;
    if (event.type === 'mousemove') {
        position = event.clientX - rect.left;
    } else {
        // Per input events, calcola in base al valore
        const percentage = slider.value / slider.max;
        position = percentage * rect.width;
    }

    // Limita la posizione per evitare che esca dai bordi
    position = Math.max(thumbWidth/2, Math.min(position, rect.width - thumbWidth/2));

    elements.sliderTooltip.style.left = `${position}px`;
    elements.sliderTooltip.textContent = formatTime(time);
}

elements.speed.addEventListener('change', () => {
    player.setPlaybackRate(parseFloat(elements.speed.value));
});

document.getElementById('skipBack').addEventListener('click', () => {
    player.seekTo(player.getCurrentTime() - 30);
});

document.getElementById('skipForward').addEventListener('click', () => {
    player.seekTo(player.getCurrentTime() + 30);
});

// Mobile Autoplay Handling
document.addEventListener('touchstart', function initialPlay() {
    if (player) player.playVideo();
    document.removeEventListener('touchstart', initialPlay);
});

// clicking on #urlInput should select all the text
elements.urlInput.addEventListener('click', () => {
    elements.urlInput.select();
});

// Initialization
initTheme();
renderHistory();