/**
 * EventBus - Sistema di gestione centralizzata degli eventi (Pattern Pub/Sub)
 */

class EventBus {
    /**
     * Inizializza il bus degli eventi
     */
    constructor() {
        this.events = {};
        this.debugMode = false;
    }

    /**
     * Attiva/disattiva la modalità debug
     *
     * @param {boolean} enabled - Stato della modalità debug
     * @returns {void}
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }

    /**
     * Sottoscrive una funzione a un evento
     *
     * @param {string} eventName - Nome dell'evento
     * @param {Function} callback - Funzione da eseguire quando l'evento viene emesso
     * @returns {Function} Funzione per annullare la sottoscrizione
     */
    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }

        this.events[eventName].push(callback);

        // Ritorna una funzione per rimuovere l'event listener
        return () => {
            this.off(eventName, callback);
        };
    }

    /**
     * Rimuove un callback dall'evento
     *
     * @param {string} eventName - Nome dell'evento
     * @param {Function} callback - Funzione da rimuovere
     * @returns {void}
     */
    off(eventName, callback) {
        if (!this.events[eventName]) {
            return;
        }

        this.events[eventName] = this.events[eventName].filter(
            registeredCallback => registeredCallback !== callback
        );
    }

    /**
     * Emette un evento con i dati specificati
     *
     * @param {string} eventName - Nome dell'evento
     * @param {*} data - Dati da passare ai callback
     * @returns {void}
     */
    emit(eventName, data) {
        if (this.debugMode) {
            console.log(`EventBus: Emitting ${eventName}`, data);
        }

        if (!this.events[eventName]) {
            return;
        }

        // Crea una copia dell'array per evitare problemi se un listener rimuove un altro listener
        const callbacks = [...this.events[eventName]];

        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in EventBus callback for ${eventName}:`, error);
            }
        });

        // Emetti anche su DOM per compatibilità con il codice esistente
        document.dispatchEvent(new CustomEvent(eventName, {
            detail: data
        }));
    }

    /**
     * Sottoscrive un callback a un evento ma lo esegue solo una volta
     *
     * @param {string} eventName - Nome dell'evento
     * @param {Function} callback - Funzione da eseguire una sola volta
     * @returns {void}
     */
    once(eventName, callback) {
        const onceCallback = (data) => {
            callback(data);
            this.off(eventName, onceCallback);
        };

        this.on(eventName, onceCallback);
    }

    /**
     * Rimuove tutti i listener di un evento o di tutti gli eventi
     *
     * @param {string} [eventName] - Nome dell'evento (opzionale)
     * @returns {void}
     */
    clear(eventName) {
        if (eventName) {
            delete this.events[eventName];
        } else {
            this.events = {};
        }
    }
}

// Singleton instance
window.eventBus = new EventBus();