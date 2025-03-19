document.addEventListener('DOMContentLoaded', () => {
    const searchEngine = new SearchEngine();
    const urlInput = document.getElementById('urlInput');
    let searchTimeout;

    urlInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (!isValidYouTubeUrl(e.target.value.trim())) {
                handleSearchInput(e.target.value.trim());
            }
        }, 500);
    });

    document.addEventListener('searchResultsUpdated', (e) => {
        document.getElementById('loadingOverlay').classList.add('hidden');
        updateResultsUI(e.detail.results);
    });

    // Cache degli elementi DOM frequentemente usati
    const elements = {
        body: document.body,
        hamburgerMenu: document.querySelector('#hamburger-menu'),
        mobileMenu: document.querySelector('.mobile-menu'),
        darkModeToggle: document.querySelector('#dark-mode-toggle')
    };

    /**
     * Inizializza tutti i componenti UI
     */
    function init() {
        setupMobileMenu();
        setupDarkModeToggle();
        applyStoredTheme();
        setupMediaQueryListeners();
    }

    /**
     * Configura la funzionalità del menu mobile
     */
    function setupMobileMenu() {
        if (!elements.hamburgerMenu || !elements.mobileMenu) return;

        elements.hamburgerMenu.addEventListener('click', function() {
            elements.mobileMenu.classList.toggle('visible');
        });
    }

    /**
     * Configura la funzionalità del toggle della modalità scura
     */
    function setupDarkModeToggle() {
        if (!elements.darkModeToggle) return;

        elements.darkModeToggle.addEventListener('click', function() {
            toggleDarkMode();
        });
    }

    /**
     * Attiva/disattiva la modalità scura e salva le preferenze
     *
     * @param {boolean} [enabled] - Forza uno stato specifico
     */
    function toggleDarkMode(enabled) {
        const isDarkMode = enabled !== undefined ? enabled :
            !elements.body.classList.contains('dark-mode');

        elements.body.classList.toggle('dark-mode', isDarkMode);
        elements.darkModeToggle?.setAttribute('aria-checked', isDarkMode.toString());
        localStorage.setItem('darkMode', isDarkMode);
    }

    /**
     * Applica il tema in base alle preferenze salvate
     */
    function applyStoredTheme() {
        if (localStorage.getItem('darkMode') === 'true') {
            toggleDarkMode(true);
        }
    }

    /**
     * Configura i listener per le media query relative al tema
     */
    function setupMediaQueryListeners() {
        window.matchMedia('(prefers-color-scheme: dark)').addListener(function(e) {
            if (!localStorage.getItem('darkMode')) {
                toggleDarkMode(e.matches);
            }
        });
    }

    // Inizializza l'applicazione
    init();
});

function updateResultsUI(results) {
    const container = document.getElementById('resultsContainer');
    if (!container || !Array.isArray(results)) return;

    try {
        container.innerHTML = results.map(video => `
            <div class="group relative grid grid-cols-5 gap-4 p-3 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all cursor-pointer shadow-sm border border-transparent mb-2"
                 data-video-id="${video.videoId}">
                <div class="col-span-2 relative">
                    <img class="w-full aspect-video rounded-lg object-cover"
                         src="${video.videoThumbnails?.[4]?.url || ''}"
                         alt="${video.title?.substring(0, 50) || ''}"
                         loading="lazy">
                    <div class="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-2 py-1 rounded">
                        ${video.lengthSeconds ? formatDuration(video.lengthSeconds) : '--:--'}
                    </div>
                </div>
                <div class="col-span-3 flex flex-col justify-between">
                    <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-2 leading-tight">
                        ${video.title?.trim() || 'Titolo non disponibile'}
                    </h3>
                    <div class="flex items-center text-xs">
                        <span class="text-primary-500 dark:text-primary-400 truncate">
                            ${video.author || 'Autore sconosciuto'}
                        </span>
                        <span class="mx-2 text-gray-400">•</span>
                        <span class="text-gray-500 dark:text-gray-400">
                            ${video.viewCount ? abbreviateNumber(video.viewCount) + ' visualizzazioni' : 'Visualizzazioni non disponibili'}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = `
            <p class="text-center text-gray-500 dark:text-gray-400 py-4">
                Impossibile visualizzare i risultati
            </p>
        `;
    }
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return hours > 0
        ? `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
        : `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function abbreviateNumber(number) {
    return Intl.NumberFormat('en', {
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(number);
}

document.addEventListener('videoSelected', (e) => {
    const history = JSON.parse(localStorage.getItem('videoHistory') || '[]');
    history.unshift(e.detail.video);
    localStorage.setItem('videoHistory', JSON.stringify(history.slice(0, 100))); // Mantieni ultimi 100 elementi

    // Aggiorna UI della cronologia
    const historyEvent = new CustomEvent('historyUpdated', { detail: history });
    document.dispatchEvent(historyEvent);
});

/**
 * Handles both search and URL input submissions
 * @param {Event} event - Form submit event
 */
function handleUniversalInput(event) {
    event.preventDefault();
    const input = document.getElementById('urlInput').value.trim();

    if (isValidYouTubeUrl(input)) {
        const videoId = extractYouTubeId(input);
        if (videoId) {
            addContentItem(videoId);
            document.getElementById('urlInput').value = '';
        }
    } else {
        handleSearchInput(input);
    }
}

/**
 * Handles regular search input
 * @param {string} query - Search query
 */
function handleSearchInput(query) {
    if (query.length > 2) {
        document.getElementById('loadingOverlay').classList.remove('hidden');
        new SearchEngine().search(query);
    }
}

/**
 * Checks if input is a valid YouTube URL
 * @param {string} input - User input
 * @returns {boolean}
 */
function isValidYouTubeUrl(input) {
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/.test(input);
}

/**
 * Extracts YouTube video ID from various URL formats
 * @param {string} url - YouTube URL
 * @returns {string|null} Video ID or null if not found
 */
function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * Creates and appends new content item to the container
 * @param {string} videoId - YouTube video ID
 */
function addContentItem(videoId) {
    const container = document.getElementById('contentContainer');

    const embedHtml = `
        <div class="video-container">
            <iframe src="https://www.youtube.com/embed/${videoId}"
                    frameborder="0"
                    allowfullscreen></iframe>
        </div>
    `;

    const newItem = document.createElement('div');
    newItem.className = 'content-item';
    newItem.innerHTML = embedHtml;

    container.prepend(newItem);
}