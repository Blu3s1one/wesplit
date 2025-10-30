import { divergenceValueToLevel, DIVERGENCE_LEVELS } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface DivergenceDisplayProps {
  currentDivergence: number | null;
  allowedDivergence: number;
  isWithinLimit: boolean;
  showTarget?: boolean;
}

/**
 * Reusable component to display divergence levels with color coding
 */
export function DivergenceDisplay({
  currentDivergence,
  allowedDivergence,
  isWithinLimit,
  showTarget = true,
}: DivergenceDisplayProps) {
  const { t } = useTranslation();
  const currentDivergenceLevel =
    currentDivergence !== null
      ? DIVERGENCE_LEVELS[divergenceValueToLevel(currentDivergence)]
      : null;
  const allowedDivergenceLevel = DIVERGENCE_LEVELS[divergenceValueToLevel(allowedDivergence)];

  return (
    <div className="grid grid-cols-2 gap-3 text-xs">
      <div>
        <p className="text-gray-500 mb-1">{t('distribution.currentBalance')}</p>
        <p
          className={`font-semibold ${
            currentDivergence === null
              ? 'text-gray-400'
              : isWithinLimit
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
          }`}
        >
          {currentDivergence === null ? t('common.na') : currentDivergenceLevel?.label}
        </p>
      </div>
      {showTarget && (
        <div>
          <p className="text-gray-500 mb-1">{t('distribution.targetBalanceLevel')}</p>
          <p className="font-semibold text-gray-700 dark:text-gray-300">
            {allowedDivergenceLevel.label}
          </p>
        </div>
      )}
    </div>
  );
}

interface GroupSizeDivergenceDisplayProps {
  groupSizes: number[];
  idealSize: number;
  currentDivergence: number | null;
  allowedDivergence: number;
  isWithinLimit: boolean;
}

/**
 * Component to display group size balance with additional statistics
 */
export function GroupSizeDivergenceDisplay({
  groupSizes,
  idealSize,
  currentDivergence,
  allowedDivergence,
  isWithinLimit,
}: GroupSizeDivergenceDisplayProps) {
  const { t } = useTranslation();
  const currentDivergenceLevel =
    currentDivergence !== null
      ? DIVERGENCE_LEVELS[divergenceValueToLevel(currentDivergence)]
      : null;
  const allowedDivergenceLevel = DIVERGENCE_LEVELS[divergenceValueToLevel(allowedDivergence)];

  return (
    <div className="grid grid-cols-6 md:grid-cols-5 gap-2 text-xs">
      <div className="col-span-3 md:col-span-1">
        <p className="text-gray-500 mb-1">{t('distribution.currentBalance')}</p>
        <p
          className={`font-semibold ${
            isWithinLimit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {currentDivergenceLevel?.label}
        </p>
      </div>
      <div className="col-span-3 md:col-span-1">
        <p className="text-gray-500 mb-1">{t('distribution.targetBalanceLevel')}</p>
        <p className="font-semibold">{allowedDivergenceLevel.label}</p>
      </div>
      <div className="col-span-2 md:col-span-1">
        <p className="text-gray-500">{t('distribution.minimalSize')}</p>
        <p className="font-semibold">{Math.min(...groupSizes)}</p>
      </div>
      <div className="col-span-2 md:col-span-1">
        <p className="text-gray-500">{t('distribution.idealSize')}</p>
        <p className="font-semibold">{idealSize.toFixed(1)}</p>
      </div>
      <div className="col-span-2 md:col-span-1">
        <p className="text-gray-500">{t('distribution.maximalSize')}</p>
        <p className="font-semibold">{Math.max(...groupSizes)}</p>
      </div>
    </div>
  );
}
