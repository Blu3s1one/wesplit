import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { Suspense } from 'react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '../contexts/ThemeContext';
import { Toaster } from '../components/ui/sonner';
import { PWAUpdatePrompt } from '../components/PWAUpdatePrompt';
import i18n from '../i18n/config';

export const Route = createRootRoute({
  component: () => (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <div className="min-h-screen bg-background">
            <Outlet />
            <Toaster />
            <PWAUpdatePrompt />
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
          </div>
        </Suspense>
      </ThemeProvider>
    </I18nextProvider>
  ),
});
