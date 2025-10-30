import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';

interface AttributesHeaderProps {
  sessionId: string;
  sessionName: string;
}

export function AttributesHeader({ sessionId, sessionName }: AttributesHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-6">
      {/* Desktop: Back link at the top */}
      <Link
        to="/session/$sessionId"
        params={{ sessionId }}
        className="hidden md:inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        {t('common.backToSession')}
      </Link>

      {/* Mobile: Back button on top */}
      <div className="mb-4 md:hidden">
        <Link to="/session/$sessionId" params={{ sessionId }}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold mb-2">{t('attributes.title')}</h1>
        <p className="text-gray-600">{sessionName}</p>
      </div>
    </div>
  );
}
