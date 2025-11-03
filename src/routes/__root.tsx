import { Outlet, createRootRoute, Link } from '@tanstack/react-router';
import { Suspense, lazy } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { ThemeProvider } from '../contexts/ThemeContext';
import { Toaster } from '../components/ui/sonner';
import { PWAUpdatePrompt } from '../components/PWAUpdatePrompt';
import { Button } from '../components/ui/button';
import { Home } from 'lucide-react';
import i18n from '../i18n/config';

// Lazy load devtools only in development
const TanStackDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-devtools').then((res) => ({
        default: res.TanStackDevtools,
      }))
    )
  : () => null;

const TanStackRouterDevtoolsPanel = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-router-devtools').then((res) => ({
        default: res.TanStackRouterDevtoolsPanel,
      }))
    )
  : () => null;

function NotFound() {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-8">
          {t('errors.pageNotFound') || 'Page not found'}
        </p>
        <Button asChild>
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            {t('common.backToHome') || 'Back to Home'}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  notFoundComponent: NotFound,
  component: () => (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <div className="min-h-screen bg-background">
            <Outlet />
            <Toaster />
            <PWAUpdatePrompt />
            {import.meta.env.DEV && (
              <TanStackDevtools
                config={{
                  position: 'bottom-left',
                }}
                plugins={[
                  {
                    name: 'Tanstack Router',
                    render: <TanStackRouterDevtoolsPanel />,
                  },
                ]}
              />
            )}
          </div>
        </Suspense>
      </ThemeProvider>
    </I18nextProvider>
  ),
});
