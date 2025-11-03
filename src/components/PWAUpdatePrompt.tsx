import { useEffect } from 'react';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PWAUpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Check for updates every 30 minutes
      if (r) {
        setInterval(
          () => {
            r.update();
          },
          30 * 60 * 1000
        );
      }
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
    immediate: true, // Check for updates immediately
  });

  useEffect(() => {
    if (offlineReady) {
      toast.success('App ready to work offline!', {
        duration: 3000,
      });
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (needRefresh) {
      // Show brief toast then auto-update
      toast.info('Updating to latest version...', {
        duration: 2000,
      });

      // Automatically update and reload
      updateServiceWorker(true);
      setNeedRefresh(false);
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}
