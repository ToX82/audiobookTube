/**
 * UI Manager - Gestisce l'interfaccia utente dell'applicazione
 */

class UIManager {
    /**
     * Inizializza il gestore dell'interfaccia
     */
    constructor() {
        this.elements = {
            body: document.body,
            hamburgerMenu: document.querySelector('#hamburger-menu'),
            mobileMenu: document.querySelector('.mobile-menu'),
            darkModeToggle: document.querySelector('#dark-mode-toggle'),
            resultsContainer: document.getElementById('resultsContainer'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            urlInput: document.getElementById('urlInput'),
            historySection: document.getElementById('historySection'),
            historyList: document.getElementById('historyList')
        };

        this.init();
    }

    /**
     * Inizializza tutti i componenti UI
     */
    init() {
        this.setupMobileMenu();
        this.setupDarkModeToggle();
        this.applyStoredTheme();
        this.setupMediaQueryListeners();
    }

    /**
     * Configura la funzionalità del menu mobile
     */
    setupMobileMenu() {
        if (!this.elements.hamburgerMenu || !this.elements.mobileMenu) {
            return;
        }

        this.elements.hamburgerMenu.addEventListener('click', () => {
            this.elements.mobileMenu.classList.toggle('visible');
        });
    }

    /**
     * Configura la funzionalità del toggle della modalità scura
     */
    setupDarkModeToggle() {
        if (!this.elements.darkModeToggle) {
            return;
        }

        this.elements.darkModeToggle.addEventListener('click', () => {
            this.toggleDarkMode();
        });
    }

    /**
     * Attiva/disattiva la modalità scura e salva le preferenze
     *
     * @param {boolean} [enabled] - Forza uno stato specifico
     */
    toggleDarkMode(enabled) {
        const isDarkMode = enabled !== undefined ? enabled :
            !this.elements.body.classList.contains('dark-mode');

        this.elements.body.classList.toggle('dark-mode', isDarkMode);

        if (this.elements.darkModeToggle) {
            this.elements.darkModeToggle.setAttribute('aria-checked', isDarkMode.toString());
        }

        localStorage.setItem('darkMode', isDarkMode);
    }

    /**
     * Applica il tema in base alle preferenze salvate
     */
    applyStoredTheme() {
        if (localStorage.getItem('darkMode') === 'true') {
            this.toggleDarkMode(true);
        }
    }

    /**
     * Configura i listener per le media query relative al tema
     */
    setupMediaQueryListeners() {
        window.matchMedia('(prefers-color-scheme: dark)').addListener((e) => {
            if (!localStorage.getItem('darkMode')) {
                this.toggleDarkMode(e.matches);
            }
        });
    }

    /**
     * Mostra l'overlay di caricamento
     */
    showLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.remove('hidden');
        }
    }

    /**
     * Nasconde l'overlay di caricamento
     */
    hideLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.add('hidden');
        }
    }

    /**
     * Aggiorna l'interfaccia dei risultati di ricerca
     *
     * @param {Array} results - Risultati della ricerca
     */
    updateResultsUI(results) {
        if (!this.elements.resultsContainer || !Array.isArray(results)) {
            return;
        }

        try {
            this.elements.resultsContainer.innerHTML = results.map(video => `
                <div class="group relative grid grid-cols-5 gap-4 p-3 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all cursor-pointer shadow-sm border border-transparent mb-2"
                     data-video-id="${video.videoId}">
                    <div class="col-span-2 relative">
                        <img class="w-full aspect-video rounded-lg object-cover"
                             src="${video.videoThumbnails?.[4]?.url || ''}"
                             alt="${video.title?.substring(0, 50) || ''}"
                             loading="lazy">
                        <div class="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-2 py-1 rounded">
                            ${video.lengthSeconds ? Utils.formatDuration(video.lengthSeconds) : '--:--'}
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
                                ${video.viewCount ? Utils.abbreviateNumber(video.viewCount) + ' visualizzazioni' : 'Visualizzazioni non disponibili'}
                            </span>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            this.elements.resultsContainer.innerHTML = `
                <p class="text-center text-gray-500 dark:text-gray-400 py-4">
                    Impossibile visualizzare i risultati
                </p>
            `;
        }
    }

    /**
     * Aggiorna la sezione cronologia
     *
     * @param {Array} history - Elementi della cronologia
     */
    updateHistoryUI(history) {
        if (!this.elements.historySection || !this.elements.historyList) {
            return;
        }

        if (!history || history.length === 0) {
            this.elements.historySection.classList.add('hidden');
            return;
        }

        this.elements.historySection.classList.remove('hidden');

        const template = document.getElementById('historyItemTemplate');
        if (!template) {
            return;
        }

        this.elements.historyList.innerHTML = '';

        history.slice(0, 5).forEach(item => {
            const historyItem = this.createHistoryItem(item, template);
            this.elements.historyList.appendChild(historyItem);
        });
    }

    /**
     * Crea un elemento della cronologia
     *
     * @param {Object} item - Item della cronologia
     * @param {HTMLTemplateElement} template - Template HTML
     * @returns {HTMLElement} Elemento della cronologia
     */
    createHistoryItem(item, template) {
        const clone = document.importNode(template.content, true);

        const imgEl = clone.querySelector('img');
        if (imgEl) {
            imgEl.src = item.thumbnail || '';
            imgEl.alt = item.title || '';
        }

        const titleEl = clone.querySelector('.video-title');
        if (titleEl) {
            titleEl.textContent = item.title || 'Video senza titolo';
        }

        const timestampEl = clone.querySelector('.video-timestamp');
        if (timestampEl) {
            timestampEl.textContent = Utils.formatDuration(item.timestamp) || '0:00';
        }

        const durationEl = clone.querySelector('.video-duration');
        if (durationEl) {
            durationEl.textContent = item.duration || '--:--';
        }

        const ageEl = clone.querySelector('.video-age');
        if (ageEl) {
            ageEl.textContent = Utils.formatTimeAgo(item.lastPlayed) || 'Sconosciuto';
        }

        const progressBar = clone.querySelector('.progress-bar');
        if (progressBar && item.duration && item.timestamp) {
            const durationSec = this.parseDuration(item.duration);
            const timestampSec = this.parseDuration(item.timestamp);
            const percent = Math.min(100, Math.round((timestampSec / durationSec) * 100)) || 0;
            progressBar.style.width = `${percent}%`;
        }

        const container = clone.querySelector('.history-item');
        if (container) {
            container.setAttribute('data-video-id', item.id || '');
        }

        const deleteBtn = clone.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFromHistory(item.id);
            });
        }

        return clone;
    }

    /**
     * Rimuove un elemento dalla cronologia
     *
     * @param {string} videoId - ID del video da rimuovere
     */
    removeFromHistory(videoId) {
        const history = JSON.parse(localStorage.getItem('videoHistory') || '[]');
        const updatedHistory = history.filter(item => item.id !== videoId);
        localStorage.setItem('videoHistory', JSON.stringify(updatedHistory));

        document.dispatchEvent(new CustomEvent('historyUpdated', {
            detail: updatedHistory
        }));
    }

    /**
     * Converte una durata in formato MM:SS in secondi
     *
     * @param {string} duration - Durata in formato MM:SS o HH:MM:SS
     * @returns {number} Secondi totali
     */
    parseDuration(duration) {
        if (!duration) {
            return 0;
        }

        const parts = duration.split(':').map(Number);

        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        }

        return 0;
    }
}

// Esposizione dell'istanza del manager UI
window.uiManager = new UIManager();