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
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
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
      toast('New version available!', {
        description: 'Click to update and reload the app',
        duration: Infinity,
        action: {
          label: 'Update',
          onClick: () => {
            updateServiceWorker(true);
            setNeedRefresh(false);
          },
        },
        cancel: {
          label: 'Later',
          onClick: () => {
            setNeedRefresh(false);
          },
        },
      });
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}
