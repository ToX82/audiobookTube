class SearchEngine {
    constructor() {
        this.instances = [];
        this.currentInstance = 0;
        this.browserLanguage = navigator.language || navigator.userLanguage || 'en-US';
        this.targetLanguage = this.getCleanLanguageCode();
        this.abortController = null;
        this.searchResultsContainer = document.getElementById('searchResults') || document.querySelector('.search-results');
        this.loadInstances();
    }

    getCleanLanguageCode() {
        const lang = this.browserLanguage.split('-')[0];
        return ['en', 'es', 'fr', 'de', 'it', 'ru', 'ja', 'pt'].includes(lang)
            ? lang
            : 'en';
    }

    async loadInstances() {
        try {
            const response = await fetch('https://api.invidious.io/instances.json');
            const data = await response.json();
            this.instances = this.processInstances(data);
        } catch (error) {
            console.error('Failed to fetch instances, using fallback', error);
            this.instances = this.getFallbackInstances();
        }
    }

    processInstances(apiData) {
        return apiData
            .filter(([_, instance]) =>
                instance.api === true &&
                instance.cors === true &&
                instance.monitor?.down === false
            )
            .sort((a, b) => b[1].monitor.uptime - a[1].monitor.uptime)
            .map(([url]) => `https://${url.replace(/\/$/, '')}`);
    }

    getFallbackInstances() {
        return [
            'https://yewtu.be',
            'https://inv.nadeko.net',
            'https://id.420129.xyz'
        ];
    }

    async search(query) {
        if (this.instances.length === 0) {
            await this.loadInstances();
        }

        if (this.instances.length === 0) {
            throw new Error('No instances available');
        }

        const currentInstance = this.instances[this.currentInstance];
        if (!currentInstance) {
            this.currentInstance = 0;
            return this.search(query);
        }

        try {
            const searchParams = new URLSearchParams({
                q: query,
                sort: 'relevance',
                region: this.getRegionCode(),
                hl: this.targetLanguage, // Priorità alla lingua dell'utente
            });

            const apiUrl = new URL(`api/v1/search`, currentInstance);
            apiUrl.search = searchParams.toString();

            const response = await fetch(apiUrl.toString());

            if (!response.ok) throw new Error('HTTP error');

            const data = await response.json();
            // Priorità ai risultati nella lingua dell'utente
            const sortedResults = this.sortResultsByLanguage(data, this.targetLanguage);
            this.handleSearchResults(sortedResults);
            return sortedResults;
        } catch (error) {
            console.error('Search error:', error);
            return this.retryWithNextInstance(query);
        }
    }

    sortResultsByLanguage(results, targetLanguage) {
        return results.sort((a, b) => {
            const aLang = a.author?.toLowerCase().includes(targetLanguage) || a.title?.toLowerCase().includes(targetLanguage);
            const bLang = b.author?.toLowerCase().includes(targetLanguage) || b.title?.toLowerCase().includes(targetLanguage);

            if (aLang && !bLang) {
                return -1; // a ha la lingua target, b no
            } else if (!aLang && bLang) {
                return 1; // b ha la lingua target, a no
            } else {
                return 0; // Entrambi o nessuno hanno la lingua target
            }
        });
    }

    getRegionCode() {
        const region = this.browserLanguage.split('-')[1];
        return region ? region.toUpperCase() : null;
    }

    retryWithNextInstance(query) {
        this.currentInstance = (this.currentInstance + 1) % this.instances.length;
        return this.search(query);
    }

    handleSearchResults(results) {
        const validResults = this.filterValidResults(results)
            .sort((a, b) => (b.lengthSeconds || 0) - (a.lengthSeconds || 0));

        document.dispatchEvent(new CustomEvent('searchResultsUpdated', {
            detail: { results: validResults }
        }));

        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();

        document.addEventListener('click', (e) => {
            const videoElement = e.target.closest('[data-video-id]');
            if (videoElement) {
                this.clearSearchResults();

                const videoId = videoElement.dataset.videoId;
                const videoData = validResults.find(r => r.videoId === videoId);

                if (videoData) {
                    this.addToHistory(videoData);
                    document.dispatchEvent(new CustomEvent('playVideo', {
                        detail: { videoId }
                    }));
                }
            }
        }, { signal: this.abortController.signal });
    }

    clearSearchResults() {
        console.log("Pulizia risultati di ricerca");

        // 1. Rimuovi tutti gli elementi con data-video-id (risultati di ricerca)
        document.querySelectorAll('[data-video-id]').forEach(el => {
            console.log("Rimozione elemento:", el);
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

        // 3. Pulisci il campo di ricerca
        document.querySelectorAll('input[type="search"], input[type="text"]').forEach(input => {
            input.value = '';
        });

        // 4. Forza un refresh del layout
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);

        // 5. Notifica altri componenti
        document.dispatchEvent(new CustomEvent('searchResultsCleared', {
            detail: { forceClear: true }
        }));
    }

    addToHistory(videoData) {
        const historyEvent = new CustomEvent('videoSelected', {
            detail: {
                video: {
                    id: videoData.videoId,
                    title: videoData.title,
                    thumbnail: videoData.videoThumbnails?.[0]?.url,
                    duration: this.formatDuration(videoData.lengthSeconds),
                    timestamp: new Date().toISOString()
                }
            }
        });
        document.dispatchEvent(historyEvent);
    }

    formatDuration(seconds) {
        if (!seconds) return '00:00';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    /**
     * Filtra i risultati validi dalla risposta API
     *
     * @param {Array} results - Risultati della ricerca
     * @returns {Array} - Risultati filtrati
     */
    filterValidResults(results) {
        return results.filter(item =>
            item.title &&
            item.videoId
        );
    }
}

// Esportazione per uso modulare
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchEngine;
}

/**
 * Performs a search request to the API
 *
 * @param {Object} params - The search parameters
 * @param {Function} callback - Optional callback for successful results
 * @returns {Promise} - A promise resolving to search results
 */
function executeSearch(params, callback) {
    return $.ajax({
        url: '/api/search',
        method: 'GET',
        data: params,
        success: function(data) {
            if (callback) {
                callback(data);
            } else {
                displayResults(data);
            }
        },
        error: function(err) {
            console.error('Errore nella ricerca:', err);
        }
    });
}

/**
 * Performs a text search
 *
 * @param {string} query - The search query
 */
function performSearch(query) {
    executeSearch({ q: query });
}

/**
 * Performs a category search
 *
 * @param {string} category - The category to search
 */
function searchByCategory(category) {
    executeSearch({ category: category });
}