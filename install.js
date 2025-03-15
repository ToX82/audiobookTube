// Registrazione del service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registrato con successo:', registration.scope);
            })
            .catch(error => {
                console.log('Registrazione Service Worker fallita:', error);
            });
    });

    // Controlla se l'app è già installata
    const isRunningStandalone = () => {
        return (window.matchMedia('(display-mode: standalone)').matches) ||
               (window.navigator.standalone) ||
               document.referrer.includes('android-app://');
    };

    // Logica per l'installazione dell'app
    let deferredPrompt;
    const installButton = document.createElement('button');
    installButton.style.display = 'none';
    document.body.appendChild(installButton);

    // Trasformiamo il pulsante in un banner chiudibile
    installButton.className = "fixed top-0 left-0 right-0 p-2 bg-primary-50 dark:bg-gray-800 border-b border-primary-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 shadow-sm flex items-center justify-center transition-all z-50";
    installButton.innerHTML = '<div class="container mx-auto px-4 max-w-3xl flex items-center justify-between"><div class="flex items-center"><iconify-icon icon="mdi:download" class="mr-1 text-primary-500 dark:text-primary-400"></iconify-icon> <span>Installa AudioBookTube sul tuo dispositivo</span></div><button id="installCloseBtn" class="p-1 ml-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><iconify-icon icon="mdi:close" class="text-sm"></iconify-icon></button></div>';

    window.addEventListener('beforeinstallprompt', (e) => {
        // Se l'app è già in modalità standalone, non mostrare il banner
        if (isRunningStandalone()) {
            return;
        }

        // Previene la visualizzazione automatica del prompt
        e.preventDefault();
        // Salva l'evento per usarlo dopo
        deferredPrompt = e;

        // Controlla se l'utente ha già chiuso il banner in precedenza
        if (localStorage.getItem('installBannerClosed') !== 'true') {
            // Mostra il banner di installazione
            installButton.style.display = 'flex';

            // Aggiungi il gestore per il pulsante di chiusura
            const closeBtn = installButton.querySelector('#installCloseBtn');
            closeBtn.addEventListener('click', (evt) => {
                evt.stopPropagation(); // Previene l'attivazione del banner
                installButton.style.display = 'none';
                // Salva una preferenza che l'utente ha chiuso il banner
                localStorage.setItem('installBannerClosed', 'true');
            });
        }
    });

    installButton.addEventListener('click', async (e) => {
        // Ignora i click sul pulsante di chiusura
        if (e.target.closest('#installCloseBtn')) {
            return;
        }

        if (deferredPrompt) {
            // Mostra il prompt di installazione
            deferredPrompt.prompt();
            // Attende la scelta dell'utente
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`Utente ha scelto: ${outcome}`);
            // Non possiamo usare deferredPrompt di nuovo, lo resettiamo
            deferredPrompt = null;
            // Nascondi il banner
            installButton.style.display = 'none';
        }
    });
}