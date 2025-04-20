/**
 * Configurazione globale dell'applicazione
 */
const AppConfig = {
    /**
     * URL del proxy CORS - per la ricerca su YouTube
     */
    //proxyUrl: 'https://corsproxy.io/?url=',
    proxyUrl: 'https://everyorigin.jwvbremen.nl/get?url=',

    /**
     * Helper per ottenere un URL con proxy
     * @param {String} url - URL da proxare
     * @returns {String} URL completo con proxy
     */
    getProxiedUrl: function(url) {
        return this.proxyUrl + encodeURIComponent(url);
    }
};
