import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';

// Installed copies of the app (home-screen PWA on phones) are rarely fully closed, so the
// service worker would keep serving an old build. Check for a new build on start and every time
// the app comes back to the foreground, and switch to it as soon as it is installed.
const isTyping = () => {
  const el = document.activeElement;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
};

export function setupServiceWorker() {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const checkForUpdate = () => {
        if (navigator.onLine) registration.update().catch(() => {});
      };
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate();
      });
      setInterval(checkForUpdate, 30 * 60 * 1000);
    },
    onNeedReload() {
      // Never throw away something the user is typing (e.g. a review): ask instead
      if (document.visibilityState === 'visible' && isTyping()) {
        toast('A new version of RateProf is ready', {
          duration: Infinity,
          action: { label: 'Refresh', onClick: () => window.location.reload() }
        });
        return;
      }
      window.location.reload();
    }
  });
}
