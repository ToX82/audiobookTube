/**
 * Main Application - Punto di ingresso principale dell'applicazione
 */

document.addEventListener('DOMContentLoaded', () => {
    const searchEngine = new SearchEngine();
    const urlInput = document.getElementById('urlInput');
    let searchTimeout;

    urlInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (!ApiService.isValidYouTubeUrl(e.target.value.trim())) {
                handleSearchInput(e.target.value.trim());
            }
        }, 500);
    });

    document.addEventListener('searchResultsUpdated', (e) => {
        document.getElementById('loadingOverlay').classList.add('hidden');
        uiManager.updateResultsUI(e.detail.results);
    });

    document.addEventListener('historyUpdated', (e) => {
        uiManager.updateHistoryUI(e.detail);
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
        initHistory();
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

    /**
     * Inizializza la cronologia
     */
    function initHistory() {
        const history = JSON.parse(localStorage.getItem('videoHistory') || '[]');
        uiManager.updateHistoryUI(history);

        // Listener per "Clear History"
        document.getElementById('clearHistory').addEventListener('click', () => {
            localStorage.removeItem('videoHistory');
            uiManager.updateHistoryUI([]);
        });
    }

    // Inizializza l'applicazione
    init();
});

/**
 * Gestisce sia la ricerca che gli input di URL
 *
 * @param {Event} event - Evento submit del form
 */
function handleUniversalInput(event) {
    event.preventDefault();
    const input = document.getElementById('urlInput').value.trim();

    if (ApiService.isValidYouTubeUrl(input)) {
        const videoId = ApiService.extractYouTubeId(input);
        if (videoId) {
            addContentItem(videoId);
            document.getElementById('urlInput').value = '';
        }
    } else {
        handleSearchInput(input);
    }
}

/**
 * Gestisce l'input di ricerca regolare
 *
 * @param {string} query - Query di ricerca
 */
function handleSearchInput(query) {
    if (query.length > 2) {
        uiManager.showLoading();
        new SearchEngine().search(query);
    }
}

/**
 * Crea e aggiunge un nuovo elemento di contenuto al container
 *
 * @param {string} videoId - ID del video di YouTube
 */
function addContentItem(videoId) {
    const container = document.getElementById('contentContainer');
    if (!container) {
        return;
    }

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

    // Dispara evento di riproduzione video
    document.dispatchEvent(new CustomEvent('playVideo', {
        detail: { videoId }
    }));
}