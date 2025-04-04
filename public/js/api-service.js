/**
 * API Service - Gestisce le chiamate API per la ricerca
 */

/**
 * Esegue una richiesta di ricerca all'API
 *
 * @param {Object} params - Parametri della ricerca
 * @param {Function} callback - Callback opzionale per i risultati
 * @returns {Promise} Promise con i risultati della ricerca
 */
function executeSearch(params, callback) {
    return fetch('/api/search?' + new URLSearchParams(params), {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Errore nella ricerca: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            if (callback) {
                callback(data);
            } else {
                displayResults(data);
            }
            return data;
        })
        .catch(error => {
            console.error('Errore nella ricerca:', error);
            throw error;
        });
}

/**
 * Esegue una ricerca testuale
 *
 * @param {string} query - Testo della ricerca
 * @returns {Promise} Promise con i risultati della ricerca
 */
function performSearch(query) {
    return executeSearch({ q: query });
}

/**
 * Esegue una ricerca per categoria
 *
 * @param {string} category - Categoria da cercare
 * @returns {Promise} Promise con i risultati della ricerca
 */
function searchByCategory(category) {
    return executeSearch({ category: category });
}

/**
 * Controlla se l'input è un URL YouTube valido
 *
 * @param {string} input - Input dell'utente
 * @returns {boolean} true se è un URL YouTube valido
 */
function isValidYouTubeUrl(input) {
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/.test(input);
}

/**
 * Estrae l'ID video di YouTube da vari formati di URL
 *
 * @param {string} url - URL di YouTube
 * @returns {string|null} ID del video o null se non trovato
 */
function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Esposizione delle funzioni
window.ApiService = {
    executeSearch,
    performSearch,
    searchByCategory,
    isValidYouTubeUrl,
    extractYouTubeId
};