import { Controller } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { FormDialog } from './shared/FormDialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import type { Element, ElementInput, Attribute } from '../db/schemas';

const ElementFormSchema = z.object({
  name: z.string().min(1, 'Element name is required'),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

type ElementFormData = z.infer<typeof ElementFormSchema>;

interface ElementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  element?: Element;
  attributes: Attribute[];
  sessionId: string;
  elementLabel?: string;
  onSubmit: (data: ElementInput) => Promise<void>;
}

export function ElementDialog({
  open,
  onOpenChange,
  element,
  attributes,
  sessionId,
  elementLabel = 'element',
  onSubmit,
}: ElementDialogProps) {
  const { t } = useTranslation();
  const capitalizedLabel = elementLabel.charAt(0).toUpperCase() + elementLabel.slice(1);

  const handleSubmit = async (data: ElementFormData) => {
    await onSubmit({
      sessionId,
      name: data.name,
      attributes: (data.attributes || {}) as Record<string, string | number | boolean>,
      ...(element && { id: element.id }),
    });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        element
          ? t('elementDialog.editTitle', { label: capitalizedLabel })
          : t('elementDialog.addTitle', { label: capitalizedLabel })
      }
      description={
        element
          ? t('elementDialog.editDescription', { label: elementLabel })
          : t('elementDialog.addDescription', { label: elementLabel })
      }
      defaultValues={{
        name: element?.name || '',
        attributes: element?.attributes || {},
      }}
      schema={ElementFormSchema}
      onSubmit={handleSubmit}
      submitLabel={element ? t('common.update') : t('common.add')}
      maxWidth="2xl"
    >
      {({ register, errors, control }) => (
        <>
          {/* Name field */}
          <div className="grid gap-2">
            <Label htmlFor="name">
              {t('elementDialog.nameLabel', { label: capitalizedLabel })}
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder={t('elementDialog.namePlaceholder')}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          {/* Dynamic attribute fields */}
          {attributes.length > 0 && (
            <div className="border-t pt-4 mt-2">
              <h4 className="font-semibold mb-3">{t('attributes.title')}</h4>
              <div className="grid gap-4">
                {attributes.map((attr) => (
                  <AttributeField key={attr.id} attribute={attr} control={control} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </FormDialog>
  );
}

function AttributeField({
  attribute,
  control,
}: {
  attribute: Attribute;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
}) {
  const { t } = useTranslation();

  if (attribute.type === 'enum') {
    return (
      <Controller
        name={`attributes.${attribute.id}`}
        control={control}
        rules={{ required: attribute.required ? t('elementDialog.fieldRequired') : false }}
        render={({ field, fieldState: { error } }) => (
          <div className="grid gap-2">
            <Label htmlFor={field.name}>
              {attribute.name}
              {attribute.required && ' *'}
            </Label>
            <Select
              value={field.value ? String(field.value) : undefined}
              onValueChange={field.onChange}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t('elementDialog.selectPlaceholder', {
                    name: attribute.name.toLowerCase(),
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {attribute.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-red-500">{error.message}</p>}
          </div>
        )}
      />
    );
  }

  if (attribute.type === 'number') {
    const hasMinMax = attribute.min !== undefined && attribute.max !== undefined;

    return (
      <Controller
        name={`attributes.${attribute.id}`}
        control={control}
        rules={{
          required: attribute.required ? t('elementDialog.fieldRequired') : false,
          validate: (value) => {
            if (value === undefined || value === null || value === '') {
              return attribute.required ? t('elementDialog.fieldRequired') : true;
            }
            const num = Number(value);
            if (isNaN(num)) {
              return t('elementDialog.mustBeNumber');
            }
            if (attribute.min !== undefined && num < attribute.min) {
              return t('elementDialog.mustBeAtLeast', { min: attribute.min });
            }
            if (attribute.max !== undefined && num > attribute.max) {
              return t('elementDialog.mustBeAtMost', { max: attribute.max });
            }
            return true;
          },
        }}
        render={({ field, fieldState: { error } }) => (
          <div className="grid gap-2">
            <Label htmlFor={field.name}>
              {attribute.name}
              {attribute.required && ' *'}
              {(attribute.min !== undefined || attribute.max !== undefined) && (
                <span className="text-sm text-gray-500 ml-1">
                  ({attribute.min !== undefined && `min: ${attribute.min}`}
                  {attribute.min !== undefined && attribute.max !== undefined && ', '}
                  {attribute.max !== undefined && `max: ${attribute.max}`})
                </span>
              )}
            </Label>
            {hasMinMax && (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <Slider
                    value={[field.value ?? attribute.min]}
                    onValueChange={(value) => field.onChange(value[0])}
                    min={attribute.min}
                    max={attribute.max}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium min-w-[3rem] text-center">
                    {field.value ?? attribute.min}
                  </span>
                </div>
              </div>
            )}

            <Input
              id={field.name}
              name={field.name}
              type="number"
              value={field.value ?? ''}
              onChange={(e) => {
                const value = e.target.value === '' ? undefined : Number(e.target.value);
                field.onChange(value);
              }}
              min={attribute.min}
              max={attribute.max}
              placeholder={t('elementDialog.enterPlaceholder', {
                name: attribute.name.toLowerCase(),
              })}
            />
            {error && <p className="text-sm text-red-500">{error.message}</p>}
          </div>
        )}
      />
    );
  }

  // Attractive and Repulsive attributes: boolean checkbox
  if (attribute.type === 'attractive' || attribute.type === 'repulsive') {
    return (
      <Controller
        name={`attributes.${attribute.id}`}
        control={control}
        defaultValue={false}
        rules={{ required: attribute.required ? t('elementDialog.fieldRequired') : false }}
        render={({ field, fieldState: { error } }) => (
          <div className="grid gap-2">
            <div className="flex items-center gap-3 p-3 border rounded-md">
              <input
                id={field.name}
                type="checkbox"
                checked={field.value === true || field.value === 'true'}
                onChange={(e) => field.onChange(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor={field.name} className="cursor-pointer flex-1">
                {attribute.name}
                {attribute.required && ' *'}
                <span className="text-sm text-gray-500 ml-2 block">
                  {attribute.type === 'attractive'
                    ? t('elementDialog.attractiveHint')
                    : t('elementDialog.repulsiveHint')}
                </span>
              </Label>
            </div>
            {error && <p className="text-sm text-red-500">{error.message}</p>}
          </div>
        )}
      />
    );
  }

  return null;
}
