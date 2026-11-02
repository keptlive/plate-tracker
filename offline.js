/* Same-origin static game cache. Hometown requests are always network-only. */
const localPreview = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
if ('serviceWorker' in navigator && (!localPreview || new URLSearchParams(location.search).has('offline-test'))) {
  const status = document.getElementById('offlineStatus');
  navigator.serviceWorker.register('./sw.js').then(async registration => {
    await navigator.serviceWorker.ready;
    status.textContent = registration.waiting
      ? 'An update is ready. Close all game tabs and reopen to use it.'
      : 'Ready for offline play. Hometown lookup needs an internet connection.';
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          status.textContent = 'An update is ready. Close all game tabs and reopen to use it.';
        }
      });
    });
  }).catch(() => {
    status.textContent = 'Offline setup is unavailable. The game still works while connected.';
  });
}
