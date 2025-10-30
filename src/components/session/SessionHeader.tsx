import { Link } from '@tanstack/react-router';
import { ArrowLeft, Plus, Settings, Shuffle, List } from 'lucide-react';
import { Button } from '../ui/button';
import { pluralize, capitalize } from '../../lib/pluralize';
import { useTranslation } from 'react-i18next';

interface SessionHeaderProps {
  sessionId: string;
  sessionName: string;
  elementLabel: string;
  elementsCount: number;
  distributionsCount: number;
  firstDistributionId?: string;
  createdAt: Date;
  onAddElement: () => void;
  onCreateDistribution: () => void;
}

export function SessionHeader({
  sessionId,
  sessionName,
  elementLabel,
  elementsCount,
  distributionsCount,
  firstDistributionId,
  createdAt,
  onAddElement,
  onCreateDistribution,
}: SessionHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-6">
      {/* Desktop: Back link at the top */}
      <Link
        to="/"
        className="hidden md:inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        {t('session.header.backToSessions')}
      </Link>

      {/* Mobile: Back button and action buttons on top */}
      <div className="flex items-center justify-between mb-4 md:hidden">
        <Link to="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex gap-2">
          {distributionsCount > 0 && firstDistributionId ? (
            <Link
              to="/session/$sessionId/distributions/$distributionId"
              params={{ sessionId, distributionId: firstDistributionId }}
            >
              <Button variant="outline" size="icon">
                <Shuffle className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Button variant="outline" size="icon" onClick={onCreateDistribution}>
              <Shuffle className="h-4 w-4" />
            </Button>
          )}
          <Link to="/session/$sessionId/attributes" params={{ sessionId }}>
            <Button variant="outline" size="icon">
              <List className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/session/$sessionId/settings" params={{ sessionId }}>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <Button size="icon" onClick={onAddElement}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Title - full width on mobile, flex with buttons on desktop */}
      <div className="md:flex md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{sessionName}</h1>
          <p className="text-gray-600">
            {t('session.header.created', { date: new Date(createdAt).toLocaleDateString() })} •{' '}
            {elementsCount} {pluralize(elementLabel, elementsCount)}
          </p>
        </div>
        <div className="hidden md:flex gap-2">
          {distributionsCount > 0 && firstDistributionId ? (
            <Link
              to="/session/$sessionId/distributions/$distributionId"
              params={{ sessionId, distributionId: firstDistributionId }}
            >
              <Button variant="outline">
                <Shuffle className="mr-2 h-4 w-4" />
                {t('session.header.distributions', { count: distributionsCount })}
              </Button>
            </Link>
          ) : (
            <Button variant="outline" onClick={onCreateDistribution}>
              <Shuffle className="mr-2 h-4 w-4" />
              {t('session.header.createDistribution')}
            </Button>
          )}
          <Link to="/session/$sessionId/attributes" params={{ sessionId }}>
            <Button variant="outline">
              <List className="mr-2 h-4 w-4" />
              {t('navigation.attributes')}
            </Button>
          </Link>
          <Link to="/session/$sessionId/settings" params={{ sessionId }}>
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              {t('common.settings')}
            </Button>
          </Link>
          <Button onClick={onAddElement}>
            <Plus className="mr-2 h-4 w-4" />
            {t('session.header.addElement', { elementLabel: capitalize(elementLabel) })}
          </Button>
        </div>
      </div>
    </div>
  );
}
