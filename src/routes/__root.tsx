import { Outlet, createRootRoute } from '@tanstack/react-router';
import { Suspense, lazy } from 'react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '../contexts/ThemeContext';
import { Toaster } from '../components/ui/sonner';
import { PWAUpdatePrompt } from '../components/PWAUpdatePrompt';
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

export const Route = createRootRoute({
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
