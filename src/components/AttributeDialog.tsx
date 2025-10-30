import { useState, useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { FormDialog } from './shared/FormDialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, X } from 'lucide-react';
import type { Attribute, AttributeInput } from '../db/schemas';

const AttributeFormSchema = z.object({
  name: z.string().min(1, 'Attribute name is required'),
  type: z.enum(['enum', 'number', 'attractive', 'repulsive']),
  required: z.boolean(),
  min: z.number().optional(),
  max: z.number().optional(),
});

type AttributeFormData = z.infer<typeof AttributeFormSchema>;

interface AttributeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attribute?: Attribute;
  sessionId: string;
  onSubmit: (data: AttributeInput) => Promise<void>;
}

export function AttributeDialog({
  open,
  onOpenChange,
  attribute,
  sessionId,
  onSubmit,
}: AttributeDialogProps) {
  const { t } = useTranslation();
  const [enumOptions, setEnumOptions] = useState<string[]>(attribute?.options || []);
  const [newOption, setNewOption] = useState('');

  // Reset enum state when dialog opens/closes or attribute changes
  useEffect(() => {
    if (open) {
      setEnumOptions(attribute?.options || []);
      setNewOption('');
    }
  }, [open, attribute]);

  const addEnumOption = () => {
    if (newOption.trim() && !enumOptions.includes(newOption.trim())) {
      setEnumOptions([...enumOptions, newOption.trim()]);
      setNewOption('');
    }
  };

  const removeEnumOption = (option: string) => {
    setEnumOptions(enumOptions.filter((o) => o !== option));
  };

  const handleSubmit = async (data: AttributeFormData) => {
    // Validate enum options
    if (data.type === 'enum' && enumOptions.length === 0) {
      throw new Error(t('attributeDialog.enumOptionsRequired'));
    }

    const attributeData: AttributeInput = {
      sessionId,
      name: data.name,
      type: data.type,
      required: data.required,
      ...(attribute && { id: attribute.id }),
    };

    if (data.type === 'enum') {
      attributeData.options = enumOptions;
    } else if (data.type === 'number') {
      if (data.min !== undefined && data.min !== null) {
        attributeData.min = data.min;
      }
      if (data.max !== undefined && data.max !== null) {
        attributeData.max = data.max;
      }
    }

    await onSubmit(attributeData);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={attribute ? t('attributes.editAttribute') : t('attributes.addAttribute')}
      description={
        attribute ? t('attributeDialog.editDescription') : t('attributeDialog.addDescription')
      }
      defaultValues={{
        name: attribute?.name || '',
        type: attribute?.type || 'enum',
        required: attribute?.required || false,
        min: attribute?.min,
        max: attribute?.max,
      }}
      schema={AttributeFormSchema}
      onSubmit={handleSubmit}
      submitLabel={attribute ? t('common.update') : t('common.add')}
      maxWidth="2xl"
    >
      {({ register, errors, watch, control }) => {
        const type = watch('type');

        return (
          <>
            {/* Name field */}
            <div className="grid gap-2">
              <Label htmlFor="name">{t('attributeDialog.nameLabel')}</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder={t('attributeDialog.namePlaceholder')}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            {/* Type field */}
            <div className="grid gap-2">
              <Label htmlFor="type">{t('attributeDialog.typeLabel')}</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enum">{t('attributeDialog.types.enum')}</SelectItem>
                      <SelectItem value="number">{t('attributeDialog.types.number')}</SelectItem>
                      <SelectItem value="attractive">
                        {t('attributeDialog.types.attractive')}
                      </SelectItem>
                      <SelectItem value="repulsive">
                        {t('attributeDialog.types.repulsive')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-gray-500">
                {type === 'enum'
                  ? t('attributeDialog.typeDescriptions.enum')
                  : type === 'number'
                    ? t('attributeDialog.typeDescriptions.number')
                    : type === 'attractive'
                      ? t('attributeDialog.typeDescriptions.attractive')
                      : t('attributeDialog.typeDescriptions.repulsive')}
              </p>
            </div>

            {/* Required field */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="required"
                {...register('required')}
                className="h-4 w-4"
                disabled={type === 'attractive' || type === 'repulsive'}
              />
              <Label
                htmlFor="required"
                className={
                  type === 'attractive' || type === 'repulsive'
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer'
                }
              >
                {t('attributeDialog.requiredLabel')}
              </Label>
              {(type === 'attractive' || type === 'repulsive') && (
                <p className="text-xs text-gray-500">{t('attributeDialog.notAvailableForType')}</p>
              )}
            </div>

            {/* Enum options */}
            {type === 'enum' && (
              <div className="border-t pt-4 mt-2">
                <Label>{t('attributeDialog.optionsLabel')}</Label>
                <p className="text-sm text-gray-500 mb-3">{t('attributeDialog.optionsHint')}</p>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder={t('attributeDialog.optionPlaceholder')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addEnumOption();
                      }
                    }}
                  />
                  <Button type="button" onClick={addEnumOption} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {enumOptions.map((option) => (
                    <div
                      key={option}
                      className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-md"
                    >
                      <span>{option}</span>
                      <button
                        type="button"
                        onClick={() => removeEnumOption(option)}
                        className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {enumOptions.length === 0 && (
                  <p className="text-sm text-red-500 mt-2">
                    {t('attributeDialog.atLeastOneOption')}
                  </p>
                )}
              </div>
            )}

            {/* Number constraints */}
            {type === 'number' && (
              <div className="border-t pt-4 mt-2 grid gap-4">
                <Label>{t('attributeDialog.constraintsLabel')}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="min">{t('attributeDialog.minValue')}</Label>
                    <Input
                      id="min"
                      type="number"
                      {...register('min', { valueAsNumber: true })}
                      placeholder={t('attributeDialog.noMinimum')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="max">{t('attributeDialog.maxValue')}</Label>
                    <Input
                      id="max"
                      type="number"
                      {...register('max', { valueAsNumber: true })}
                      placeholder={t('attributeDialog.noMaximum')}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        );
      }}
    </FormDialog>
  );
}
