/**
 * Utility Functions - Funzioni di utilità condivise
 */

/**
 * Formatta la durata in HH:MM:SS o MM:SS
 *
 * @param {number} seconds - Secondi totali
 * @returns {string} Durata formattata
 */
function formatDuration(seconds) {
    if (!seconds) {
        return '00:00';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

/**
 * Abbrevia un numero grande in formato compatto (1.5K, 2.3M)
 *
 * @param {number} number - Numero da abbreviare
 * @returns {string} Numero abbreviato
 */
function abbreviateNumber(number) {
    return Intl.NumberFormat('it', {
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(number);
}

/**
 * Formatta una data relativa (es: "2 giorni fa")
 *
 * @param {number|string} timestamp - Timestamp o data ISO
 * @returns {string} Data relativa formattata
 */
function formatTimeAgo(timestamp) {
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
        return 'Adesso';
    } else if (diffMin < 60) {
        return `${diffMin} ${diffMin === 1 ? 'minuto' : 'minuti'} fa`;
    } else if (diffHour < 24) {
        return `${diffHour} ${diffHour === 1 ? 'ora' : 'ore'} fa`;
    } else if (diffDay < 30) {
        return `${diffDay} ${diffDay === 1 ? 'giorno' : 'giorni'} fa`;
    } else {
        return date.toLocaleDateString('it-IT', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

/**
 * Debounce una funzione per evitare chiamate multiple ravvicinate
 *
 * @param {Function} func - Funzione da eseguire
 * @param {number} wait - Millisecondi di attesa
 * @returns {Function} Funzione con debounce
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Esposizione dell'oggetto Utils
window.Utils = {
    formatDuration,
    abbreviateNumber,
    formatTimeAgo,
    debounce
};