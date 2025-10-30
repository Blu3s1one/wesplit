import { RefreshCw, Shuffle } from 'lucide-react';
import { Button } from '../ui/button';
import { SidebarTrigger } from '../ui/sidebar';
import { pluralize } from '../../lib/pluralize';
import { useTranslation } from 'react-i18next';

interface DistributionHeaderProps {
  distributionName: string;
  sessionName: string;
  groupCount: number;
  isRegenerating: boolean;
  onRegenerate: () => void;
  onCreateFromDistribution: () => void;
}

export function DistributionHeader({
  distributionName,
  sessionName,
  groupCount,
  isRegenerating,
  onRegenerate,
  onCreateFromDistribution,
}: DistributionHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-6">
      {/* Mobile: Trigger and Buttons on top */}
      <div className="flex items-center justify-between mb-4 md:hidden">
        <SidebarTrigger />
        <div className="flex gap-2">
          <Button onClick={onRegenerate} variant="outline" disabled={isRegenerating} size="icon">
            <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={onCreateFromDistribution} size="icon">
            <Shuffle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Title - full width on mobile, flex with buttons on desktop */}
      <div className="md:flex md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{distributionName}</h1>
          <p className="text-gray-600">
            {sessionName} • {groupCount} {pluralize('group', groupCount)}
          </p>
        </div>
        <div className="hidden md:flex gap-2">
          <Button onClick={onRegenerate} variant="outline" disabled={isRegenerating}>
            <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''} md:mr-2`} />
            <span className="hidden md:inline">
              {isRegenerating ? t('distribution.regenerating') : t('distribution.reRandomize')}
            </span>
          </Button>
          <Button onClick={onCreateFromDistribution}>
            <Shuffle className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t('distribution.createFromDistribution')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
