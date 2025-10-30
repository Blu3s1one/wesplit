import { useState, useEffect, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { useTranslation } from 'react-i18next';
import type { Attribute, Constraint } from '../db/schemas';
import { DistributionGenerationError } from '../lib/distributionAlgorithms';
import {
  type DivergenceLevel,
  DIVERGENCE_LEVELS,
  divergenceLevelToValue,
  sliderIndexToLevel,
  levelToSliderIndex,
} from '../lib/utils';
import { Slider } from './ui/slider';

interface DistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attributes: Attribute[];
  onSubmit: (data: {
    name: string;
    groupCount: number;
    constraints: Constraint[];
  }) => void | Promise<void>;
}

export function DistributionDialog({
  open,
  onOpenChange,
  attributes,
  onSubmit,
}: DistributionDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [groupCount, setGroupCount] = useState(2);
  const [selectedConstraints, setSelectedConstraints] = useState<Set<string>>(new Set());
  const [divergenceLevels, setDivergenceLevels] = useState<Map<string, DivergenceLevel>>(new Map());
  const [enumModes, setEnumModes] = useState<Map<string, 'balance' | 'exclude'>>(new Map());
  const [mandatoryConstraints, setMandatoryConstraints] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isRetryable, setIsRetryable] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [balanceGroupSizes, setBalanceGroupSizes] = useState(true);
  const [groupSizesLevel, setGroupSizesLevel] = useState<DivergenceLevel>('strict');

  useEffect(() => {
    if (open) {
      // Generate default name
      const timestamp = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      setName(`${t('distribution.title')} ${timestamp}`);
      setGroupCount(2);
      setSelectedConstraints(new Set());
      // Initialize divergence levels for number and enum attributes
      const initialLevels = new Map<string, DivergenceLevel>();
      attributes
        .filter((attr) => attr.type === 'number' || attr.type === 'enum')
        .forEach((attr) => {
          initialLevels.set(attr.id, 'mid'); // Default to mid level (50%)
        });
      setDivergenceLevels(initialLevels);
      // Initialize enum modes
      const initialEnumModes = new Map<string, 'balance' | 'exclude'>();
      attributes
        .filter((attr) => attr.type === 'enum')
        .forEach((attr) => {
          initialEnumModes.set(attr.id, 'balance'); // Default balance
        });
      setEnumModes(initialEnumModes);
      setMandatoryConstraints(new Set());
      setError(undefined);
      setIsRetryable(false);
      setOpenAccordions([]);
      setBalanceGroupSizes(true);
      setGroupSizesLevel('strict'); // Default to strict (25%)
    }
  }, [open, attributes]);

  const toggleConstraint = (attributeId: string) => {
    const newConstraints = new Set(selectedConstraints);
    if (newConstraints.has(attributeId)) {
      newConstraints.delete(attributeId);
      // Close the accordion when unchecking
      setOpenAccordions((prev) => prev.filter((id) => id !== attributeId));
    } else {
      newConstraints.add(attributeId);
    }
    setSelectedConstraints(newConstraints);
  };

  const updateDivergenceLevel = (attributeId: string, level: DivergenceLevel) => {
    const newLevels = new Map(divergenceLevels);
    newLevels.set(attributeId, level);
    setDivergenceLevels(newLevels);
  };

  const updateEnumMode = (attributeId: string, mode: 'balance' | 'exclude') => {
    const newModes = new Map(enumModes);
    newModes.set(attributeId, mode);
    setEnumModes(newModes);
  };

  const toggleMandatory = (attributeId: string) => {
    const newMandatory = new Set(mandatoryConstraints);
    if (newMandatory.has(attributeId)) {
      newMandatory.delete(attributeId);
    } else {
      newMandatory.add(attributeId);
    }
    setMandatoryConstraints(newMandatory);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setIsRetryable(false);

    if (!name.trim()) {
      setError(t('distributionDialog.nameRequired'));
      return;
    }

    if (groupCount < 2) {
      setError(t('distributionDialog.atLeast2Groups'));
      return;
    }

    if (groupCount > 20) {
      setError(t('distributionDialog.max20Groups'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Build constraints array
      const constraints: Constraint[] = [];

      // Add default constraint if enabled
      if (balanceGroupSizes) {
        constraints.push({
          type: 'default' as const,
          balanceGroupSizes: true,
          allowedDivergence: divergenceLevelToValue(groupSizesLevel),
        });
      }

      // Add attribute-based constraints
      constraints.push(
        ...Array.from(selectedConstraints).map((attrId) => {
          const attr = attributes.find((a) => a.id === attrId);
          const isMandatory = mandatoryConstraints.has(attrId);

          if (attr?.type === 'enum') {
            return {
              type: 'enum' as const,
              attributeId: attrId,
              mode: enumModes.get(attrId) ?? 'balance',
              mandatory: isMandatory,
              allowedDivergence: divergenceLevelToValue(divergenceLevels.get(attrId) ?? 'mid'),
            };
          } else if (attr?.type === 'attractive') {
            return {
              type: 'attractive' as const,
              attributeId: attrId,
              mandatory: isMandatory,
            };
          } else if (attr?.type === 'repulsive') {
            return {
              type: 'repulsive' as const,
              attributeId: attrId,
              mandatory: isMandatory,
            };
          } else {
            return {
              type: 'number' as const,
              attributeId: attrId,
              balanceAverage: true,
              allowedDivergence: divergenceLevelToValue(divergenceLevels.get(attrId) ?? 'mid'),
            };
          }
        })
      );

      await onSubmit({
        name: name.trim(),
        groupCount,
        constraints,
      });

      onOpenChange(false);
    } catch (err) {
      if (err instanceof DistributionGenerationError) {
        setError(err.message);
        setIsRetryable(err.retryable);
      } else {
        setError(err instanceof Error ? err.message : t('distributionDialog.createFailed'));
        setIsRetryable(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('distribution.createDistribution')}</DialogTitle>
          <DialogDescription>{t('distributionDialog.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-hidden">
          <div className="space-y-4 overflow-y-auto pr-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="dist-name">{t('distributionDialog.nameLabel')}</Label>
              <Input
                id="dist-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('distributionDialog.namePlaceholder')}
                disabled={isSubmitting}
              />
            </div>

            {/* Group Count */}
            <div className="space-y-2">
              <Label htmlFor="group-count">{t('distribution.numberOfGroups')}</Label>
              <Input
                id="group-count"
                type="number"
                min="2"
                max="20"
                value={groupCount}
                onChange={(e) => setGroupCount(parseInt(e.target.value) || 2)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">{t('distributionDialog.groupCountHint')}</p>
            </div>

            {/* Default Constraint - Balance Group Sizes */}
            <div className="border rounded-md p-4 space-y-3">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={balanceGroupSizes}
                  onChange={(e) => setBalanceGroupSizes(e.target.checked)}
                  disabled={isSubmitting}
                  className="h-4 w-4 mt-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t('distribution.balanceGroupSizes')}</p>
                  <p className="text-xs text-gray-500">
                    {t('distributionDialog.balanceGroupSizesHint')}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  default
                </Badge>
              </div>

              {balanceGroupSizes && (
                <div className="pl-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-600">
                      {t('distributionDialog.balanceLevel')}
                    </Label>
                    <span className="text-sm font-medium text-primary">
                      {DIVERGENCE_LEVELS[groupSizesLevel].label}
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={4}
                    step={1}
                    value={[levelToSliderIndex(groupSizesLevel)]}
                    onValueChange={(values) => setGroupSizesLevel(sliderIndexToLevel(values[0]))}
                    disabled={isSubmitting}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{t('distributionDialog.veryStrict')}</span>
                    <span>{t('distributionDialog.veryLoose')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Constraints */}
            {attributes.length > 0 && (
              <div>
                <Label>
                  {t('distribution.constraints')} ({t('common.optional')})
                </Label>
                <p className="text-xs text-gray-500 mb-2">
                  {t('distributionDialog.selectAttributesHint')}
                </p>
                <Accordion
                  type="multiple"
                  className="border rounded-md"
                  value={openAccordions}
                  onValueChange={setOpenAccordions}
                >
                  {attributes.map((attr) => (
                    <AccordionItem
                      key={attr.id}
                      value={attr.id}
                      disabled={!selectedConstraints.has(attr.id)}
                    >
                      <div className="flex items-center gap-2 px-4">
                        <input
                          type="checkbox"
                          checked={selectedConstraints.has(attr.id)}
                          onChange={() => toggleConstraint(attr.id)}
                          disabled={isSubmitting}
                          className="h-4 w-4"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <AccordionTrigger
                          className="flex-1 py-3"
                          disabled={!selectedConstraints.has(attr.id)}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium">{attr.name}</p>
                              <p className="text-xs text-gray-500">
                                {attr.type === 'enum'
                                  ? t('distributionDialog.constraintType.enum')
                                  : attr.type === 'number'
                                    ? t('distributionDialog.constraintType.balanceAverage')
                                    : attr.type === 'attractive'
                                      ? t('distributionDialog.constraintType.attractive')
                                      : t('distributionDialog.constraintType.repulsive')}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {attr.type}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                      </div>

                      <AccordionContent>
                        <div className="px-4 space-y-3">
                          {/* Mode selector for enum attributes when selected */}
                          {attr.type === 'enum' && selectedConstraints.has(attr.id) && (
                            <div className="space-y-2">
                              <Label className="text-xs text-gray-600">
                                {t('distributionDialog.mode')}
                              </Label>
                              <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`mode-${attr.id}`}
                                    checked={enumModes.get(attr.id) === 'balance'}
                                    onChange={() => updateEnumMode(attr.id, 'balance')}
                                    disabled={isSubmitting}
                                    className="h-4 w-4"
                                  />
                                  <div>
                                    <p className="text-sm font-medium">
                                      {t('distributionDialog.modeBalance')}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {t('distributionDialog.modeBalanceHint')}
                                    </p>
                                  </div>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`mode-${attr.id}`}
                                    checked={enumModes.get(attr.id) === 'exclude'}
                                    onChange={() => updateEnumMode(attr.id, 'exclude')}
                                    disabled={isSubmitting}
                                    className="h-4 w-4"
                                  />
                                  <div>
                                    <p className="text-sm font-medium">
                                      {t('distributionDialog.modeExclude')}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {t('distributionDialog.modeExcludeHint')}
                                    </p>
                                  </div>
                                </label>
                              </div>

                              {/* Balance level selector for balance mode */}
                              {enumModes.get(attr.id) === 'balance' && (
                                <div className="pt-2 border-t space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-gray-600">
                                      {t('distributionDialog.balanceLevel')}
                                    </Label>
                                    <span className="text-sm font-medium text-primary">
                                      {
                                        DIVERGENCE_LEVELS[divergenceLevels.get(attr.id) ?? 'mid']
                                          .label
                                      }
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={4}
                                    step={1}
                                    value={[
                                      levelToSliderIndex(divergenceLevels.get(attr.id) ?? 'mid'),
                                    ]}
                                    onValueChange={(values) =>
                                      updateDivergenceLevel(attr.id, sliderIndexToLevel(values[0]))
                                    }
                                    disabled={isSubmitting}
                                    className="w-full"
                                  />
                                  <div className="flex justify-between text-xs text-gray-500">
                                    <span>{t('distributionDialog.veryStrict')}</span>
                                    <span>{t('distributionDialog.veryLoose')}</span>
                                  </div>
                                </div>
                              )}

                              {/* Mandatory checkbox for exclude mode */}
                              {enumModes.get(attr.id) === 'exclude' && (
                                <div className="pt-2 border-t">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={mandatoryConstraints.has(attr.id)}
                                      onChange={() => toggleMandatory(attr.id)}
                                      disabled={isSubmitting}
                                      className="h-4 w-4"
                                    />
                                    <div>
                                      <p className="text-sm font-medium">
                                        {t('distribution.mandatory')}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {t('distributionDialog.mandatoryHint')}
                                      </p>
                                    </div>
                                  </label>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Balance level selector for number attributes when selected */}
                          {attr.type === 'number' && selectedConstraints.has(attr.id) && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs text-gray-600">
                                  {t('distributionDialog.balanceLevel')}
                                </Label>
                                <span className="text-sm font-medium text-primary">
                                  {DIVERGENCE_LEVELS[divergenceLevels.get(attr.id) ?? 'mid'].label}
                                </span>
                              </div>
                              <Slider
                                min={0}
                                max={4}
                                step={1}
                                value={[levelToSliderIndex(divergenceLevels.get(attr.id) ?? 'mid')]}
                                onValueChange={(values) =>
                                  updateDivergenceLevel(attr.id, sliderIndexToLevel(values[0]))
                                }
                                disabled={isSubmitting}
                                className="w-full"
                              />
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>{t('distributionDialog.veryStrict')}</span>
                                <span>{t('distributionDialog.veryLoose')}</span>
                              </div>
                            </div>
                          )}

                          {/* Mandatory checkbox for attractive/repulsive constraints */}
                          {(attr.type === 'attractive' || attr.type === 'repulsive') &&
                            selectedConstraints.has(attr.id) && (
                              <div className="pt-2 border-t">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={mandatoryConstraints.has(attr.id)}
                                    onChange={() => toggleMandatory(attr.id)}
                                    disabled={isSubmitting}
                                    className="h-4 w-4"
                                  />
                                  <div>
                                    <p className="text-sm font-medium">
                                      {t('distribution.mandatory')}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {t('distributionDialog.mandatoryHint')}
                                    </p>
                                  </div>
                                </label>
                              </div>
                            )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </div>

          {/* Error - Fixed at bottom outside scrollable area */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-3 rounded-md text-sm space-y-2 shrink-0">
              <p>{error}</p>
              {isRetryable && <p className="text-xs">{t('distributionDialog.retryableError')}</p>}
            </div>
          )}

          {/* Actions - Fixed at bottom */}
          <div className="flex justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            {isRetryable ? (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('distributionDialog.retrying') : t('distributionDialog.retry')}
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('common.creating') : t('distribution.createDistribution')}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
