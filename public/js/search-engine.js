/**
 * SearchEngine class - Gestisce le ricerche su YouTube tramite Invidious API
 *
 * @class SearchEngine
 */
class SearchEngine {
    /**
     * Crea una nuova istanza del motore di ricerca
     */
    constructor() {
        this.instances = [];
        this.currentInstance = 0;
        this.browserLanguage = navigator.language || navigator.userLanguage || 'en-US';
        this.targetLanguage = this.getCleanLanguageCode();
        this.abortController = null;
        this.searchResultsContainer = document.getElementById('searchResults') || document.querySelector('.search-results');
        this.loadInstances();
    }

    /**
     * Estrae il codice lingua pulito dal browser language
     *
     * @returns {string} Codice lingua supportato
     */
    getCleanLanguageCode() {
        const lang = this.browserLanguage.split('-')[0];
        return ['en', 'es', 'fr', 'de', 'it', 'ru', 'ja', 'pt'].includes(lang) ?
            lang :
            'en';
    }

    /**
     * Carica le istanze Invidious disponibili
     *
     * @returns {Promise} Promise che si risolve quando le istanze sono state caricate
     */
    loadInstances() {
        return new Promise((resolve, reject) => {
            fetch('https://api.invidious.io/instances.json')
                .then(response => response.json())
                .then(data => {
                    this.instances = this.processInstances(data);
                    resolve(this.instances);
                })
                .catch(error => {
                    console.error('Failed to fetch instances, using fallback', error);
                    this.instances = this.getFallbackInstances();
                    resolve(this.instances);
                });
        });
    }

    /**
     * Filtra e ordina le istanze API valide
     *
     * @param {Array} apiData - Dati API delle istanze
     * @returns {Array} Istanze filtrate
     */
    processInstances(apiData) {
        return apiData
            .filter(([_, instance]) =>
                instance.api === true &&
                instance.cors === true &&
                instance.monitor && instance.monitor.down === false
            )
            .sort((a, b) => b[1].monitor.uptime - a[1].monitor.uptime)
            .map(([ url ]) => `https://${url.replace(/\/$/, '')}`);
    }

    /**
     * Fornisce istanze di fallback in caso di errore
     *
     * @returns {Array} Istanze di fallback
     */
    getFallbackInstances() {
        return [
            'https://yewtu.be',
            'https://inv.nadeko.net',
            'https://id.420129.xyz'
        ];
    }

    /**
     * Esegue una ricerca con la query fornita
     *
     * @param {string} query - Testo della ricerca
     * @returns {Promise<Array>} Risultati della ricerca
     */
    search(query) {
        return new Promise((resolve, reject) => {
            // Verifica se le istanze sono state caricate
            if (this.instances.length === 0) {
                this.loadInstances()
                    .then(() => this.performSearch(query, resolve, reject))
                    .catch(error => {
                        console.error('Search error:', error);
                        reject(error);
                    });
            } else {
                this.performSearch(query, resolve, reject);
            }
        });
    }

    /**
     * Esegue la ricerca effettiva dopo che le istanze sono state caricate
     *
     * @param {string} query - Testo della ricerca
     * @param {Function} resolve - Funzione di risoluzione Promise
     * @param {Function} reject - Funzione di rifiuto Promise
     * @returns {void}
     */
    performSearch(query, resolve, reject) {
        if (this.instances.length === 0) {
            alert('Impossibile connettersi al motore di ricerca. Riprova più tardi o incolla un URL di YouTube.');
            location.reload();
            return reject(new Error('No instances available'));
        }

        const currentInstance = this.instances[this.currentInstance];
        if (!currentInstance) {
            this.currentInstance = 0;
            return this.performSearch(query, resolve, reject);
        }

        const searchParams = new URLSearchParams({
            q: query,
            sort: 'relevance',
            region: this.getRegionCode(),
            hl: this.targetLanguage
        });

        const apiUrl = new URL('api/v1/search', currentInstance);
        apiUrl.search = searchParams.toString();

        fetch(apiUrl.toString())
            .then(response => {
                if (!response.ok) {
                    throw new Error('HTTP error');
                }
                return response.json();
            })
            .then(data => {
                const sortedResults = this.sortResultsByLanguage(data, this.targetLanguage);
                this.handleSearchResults(sortedResults);
                resolve(sortedResults);
            })
            .catch(error => {
                console.error('Search error:', error);
                this.currentInstance = (this.currentInstance + 1) % this.instances.length;
                this.performSearch(query, resolve, reject);
            });
    }

    /**
     * Ordina i risultati in base alla lingua target
     *
     * @param {Array} results - Risultati della ricerca
     * @param {string} targetLanguage - Lingua target
     * @returns {Array} Risultati ordinati
     */
    sortResultsByLanguage(results, targetLanguage) {
        return results.sort((a, b) => {
            const aLang = (a.author && a.author.toLowerCase().includes(targetLanguage)) || (a.title && a.title.toLowerCase().includes(targetLanguage));
            const bLang = (b.author && b.author.toLowerCase().includes(targetLanguage)) || (b.title && b.title.toLowerCase().includes(targetLanguage));

            if (aLang && !bLang) {
                return -1; // a ha la lingua target, b no
            } else if (!aLang && bLang) {
                return 1; // b ha la lingua target, a no
            } else {
                return 0; // Entrambi o nessuno hanno la lingua target
            }
        });
    }

    /**
     * Ottiene il codice regione dal browser language
     *
     * @returns {string|null} Codice regione
     */
    getRegionCode() {
        const region = this.browserLanguage.split('-')[1];
        return region ? region.toUpperCase() : null;
    }

    /**
     * Gestisce i risultati della ricerca
     *
     * @param {Array} results - Risultati della ricerca
     * @returns {void}
     */
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

    /**
     * Pulisce i risultati di ricerca
     *
     * @returns {void}
     */
    clearSearchResults() {
        // 1. Rimuovi tutti gli elementi con data-video-id (risultati di ricerca)
        document.querySelectorAll('[data-video-id]').forEach(el => {
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
            elements.forEach(el => {
                el.style.display = 'none';
                el.classList.add('hidden');
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

    /**
     * Aggiunge un video alla cronologia
     *
     * @param {Object} videoData - Dati del video
     * @returns {void}
     */
    addToHistory(videoData) {
        const historyEvent = new CustomEvent('videoSelected', {
            detail: {
                video: {
                    id: videoData.videoId,
                    title: videoData.title,
                    thumbnail: videoData.videoThumbnails && videoData.videoThumbnails[0] ? videoData.videoThumbnails[0].url : null,
                    duration: this.formatDuration(videoData.lengthSeconds),
                    timestamp: new Date().toISOString()
                }
            }
        });
        document.dispatchEvent(historyEvent);
    }

    /**
     * Formatta la durata in formato MM:SS
     *
     * @param {number} seconds - Secondi totali
     * @returns {string} Durata formattata
     */
    formatDuration(seconds) {
        if (!seconds) {
            return '00:00';
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    /**
     * Filtra i risultati validi dalla risposta API
     *
     * @param {Array} results - Risultati della ricerca
     * @returns {Array} Risultati filtrati
     */
    filterValidResults(results) {
        return results.filter(item =>
            item.title &&
            item.videoId
        );
    }
}

// Esposizione per uso globale
window.SearchEngine = SearchEngine;
