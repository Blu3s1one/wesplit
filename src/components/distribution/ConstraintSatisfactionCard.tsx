import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { DivergenceDisplay, GroupSizeDivergenceDisplay } from '../shared/DivergenceDisplay';
import {
  useNumberDivergence,
  useEnumDivergence,
  useGroupSizeDivergence,
} from '../../hooks/useDivergenceCalculation';
import { useTranslation } from 'react-i18next';
import type { Distribution, Element, Attribute, Constraint } from '../../db/schemas';

interface ConstraintSatisfactionCardProps {
  distribution: Distribution;
  elements: Element[];
  attributes: Attribute[];
  constraintCheck: {
    satisfied: boolean;
    issues: string[];
  };
}

export function ConstraintSatisfactionCard({
  distribution,
  elements,
  attributes,
  constraintCheck,
}: ConstraintSatisfactionCardProps) {
  const { t } = useTranslation();

  if (distribution.constraints.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">{t('distribution.constraintSatisfaction')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overall Status */}
          <div>
            {constraintCheck.satisfied ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                ✓ {t('distribution.allConstraintsSatisfied')}
              </Badge>
            ) : (
              <Badge variant="destructive">
                ⚠ {t('distribution.someConstraintsNotSatisfied')}
              </Badge>
            )}
          </div>

          {/* Constraint Details */}
          <div className="space-y-3 border-t pt-4">
            {distribution.constraints.map((constraint, idx) => (
              <ConstraintDetail
                key={idx}
                constraint={constraint}
                distribution={distribution}
                elements={elements}
                attributes={attributes}
              />
            ))}
          </div>

          {/* Issues */}
          {!constraintCheck.satisfied && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">{t('distribution.issues')}:</p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {constraintCheck.issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ConstraintDetailProps {
  constraint: Constraint;
  distribution: Distribution;
  elements: Element[];
  attributes: Attribute[];
}

function ConstraintDetail({
  constraint,
  distribution,
  elements,
  attributes,
}: ConstraintDetailProps) {
  const { t } = useTranslation();

  // Handle default constraint separately
  if (constraint.type === 'default') {
    return <DefaultConstraintDetail constraint={constraint} groups={distribution.groups} />;
  }

  // Type guard: check if constraint has attributeId
  if (!('attributeId' in constraint)) return null;

  const attribute = attributes.find((a) => a.id === constraint.attributeId);
  if (!attribute) return null;

  return (
    <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-800 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">{attribute.name}</p>
          <p className="text-xs text-gray-500">
            {constraint.type === 'enum'
              ? constraint.mode === 'exclude'
                ? t('distribution.constraintMode.exclude')
                : t('distribution.constraintMode.balance')
              : constraint.type === 'number'
                ? t('distribution.constraintMode.balanceAverage')
                : constraint.type === 'attractive'
                  ? t('distribution.constraintMode.attractive')
                  : t('distribution.constraintMode.repulsive')}
          </p>
        </div>
        <div className="flex gap-1">
          <Badge variant="outline" className="text-xs">
            {constraint.type}
            {constraint.type === 'enum' && ` - ${constraint.mode}`}
          </Badge>
          {((constraint.type === 'enum' && constraint.mandatory && constraint.mode === 'exclude') ||
            (constraint.type === 'attractive' && constraint.mandatory) ||
            (constraint.type === 'repulsive' && constraint.mandatory)) && (
            <Badge variant="default" className="text-xs bg-orange-600">
              {t('distribution.mandatory')}
            </Badge>
          )}
        </div>
      </div>

      {/* Show divergence for enum balance and number constraints */}
      {((constraint.type === 'enum' && constraint.mode === 'balance') ||
        constraint.type === 'number') && (
        <AttributeDivergenceDetail
          constraint={constraint}
          distribution={distribution}
          elements={elements}
        />
      )}
    </div>
  );
}

interface DefaultConstraintDetailProps {
  constraint: Extract<Constraint, { type: 'default' }>;
  groups: Distribution['groups'];
}

function DefaultConstraintDetail({ constraint, groups }: DefaultConstraintDetailProps) {
  const { t } = useTranslation();
  const divergence = useGroupSizeDivergence(groups);
  const groupSizes = groups.map((g) => g.members.length);
  const totalElements = groupSizes.reduce((sum, size) => sum + size, 0);
  const idealSize = totalElements / groups.length;
  const allowedDivergence = constraint.allowedDivergence ?? 0.2;
  const isWithinLimit = divergence.current !== null && divergence.isWithinLimit(allowedDivergence);

  return (
    <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-800 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">{t('distribution.balanceGroupSizes')}</p>
          <p className="text-xs text-gray-500">{t('distribution.keepGroupsEqualSize')}</p>
        </div>
        <Badge variant="outline" className="text-xs">
          default
        </Badge>
      </div>

      <div className="space-y-2">
        <GroupSizeDivergenceDisplay
          groupSizes={groupSizes}
          idealSize={idealSize}
          currentDivergence={divergence.current ?? 0}
          allowedDivergence={allowedDivergence}
          isWithinLimit={isWithinLimit}
        />
      </div>
    </div>
  );
}

interface AttributeDivergenceDetailProps {
  constraint: Extract<Constraint, { type: 'enum' }> | Extract<Constraint, { type: 'number' }>;
  distribution: Distribution;
  elements: Element[];
}

/**
 * Consolidated component for displaying divergence for both enum and number constraints
 */
function AttributeDivergenceDetail({
  constraint,
  distribution,
  elements,
}: AttributeDivergenceDetailProps) {
  if (constraint.type === 'enum') {
    return (
      <EnumDivergenceContent
        constraint={constraint}
        distribution={distribution}
        elements={elements}
      />
    );
  }
  return (
    <NumberDivergenceContent
      constraint={constraint}
      distribution={distribution}
      elements={elements}
    />
  );
}

function EnumDivergenceContent({
  constraint,
  distribution,
  elements,
}: {
  constraint: Extract<Constraint, { type: 'enum' }>;
  distribution: Distribution;
  elements: Element[];
}) {
  const divergence = useEnumDivergence(distribution.groups, elements, constraint.attributeId);
  return <DivergenceDetailDisplay divergence={divergence} constraint={constraint} />;
}

function NumberDivergenceContent({
  constraint,
  distribution,
  elements,
}: {
  constraint: Extract<Constraint, { type: 'number' }>;
  distribution: Distribution;
  elements: Element[];
}) {
  const divergence = useNumberDivergence(distribution.groups, elements, constraint.attributeId);
  return <DivergenceDetailDisplay divergence={divergence} constraint={constraint} />;
}

/**
 * Shared rendering logic for divergence details
 */
function DivergenceDetailDisplay({
  divergence,
  constraint,
}: {
  divergence: { current: number | null; isWithinLimit: (allowedDivergence: number) => boolean };
  constraint: { allowedDivergence?: number };
}) {
  const allowedDivergence = constraint.allowedDivergence ?? 0.2;
  const isWithinLimit = divergence.current !== null && divergence.isWithinLimit(allowedDivergence);

  return (
    <div className="space-y-2">
      <DivergenceDisplay
        currentDivergence={divergence.current}
        allowedDivergence={allowedDivergence}
        isWithinLimit={isWithinLimit}
      />
    </div>
  );
}
