import { Controller } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { FormDialog } from './shared/FormDialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Session, SessionInput } from '../db/schemas';

const SessionFormSchema = z.object({
  name: z.string().min(1, 'Session name is required'),
  elementLabel: z.string().min(1, 'Element label is required'),
  colorTheme: z.enum(['basic', 'blue', 'red', 'green', 'purple']),
});

type SessionFormData = z.infer<typeof SessionFormSchema>;

interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: Session;
  onSubmit: (data: SessionInput) => Promise<void>;
}

export function SessionDialog({ open, onOpenChange, session, onSubmit }: SessionDialogProps) {
  const { t } = useTranslation();

  const handleSubmit = async (data: SessionFormData) => {
    await onSubmit({
      name: data.name,
      elementLabel: data.elementLabel,
      colorTheme: data.colorTheme,
      ...(session && { id: session.id, createdAt: session.createdAt }),
    });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={session ? t('sessionDialog.editTitle') : t('sessionDialog.title')}
      description={session ? t('sessionDialog.editDescription') : t('sessionDialog.description')}
      defaultValues={{
        name: session?.name || '',
        elementLabel: session?.elementLabel || 'element',
        colorTheme: session?.colorTheme || 'basic',
      }}
      schema={SessionFormSchema}
      onSubmit={handleSubmit}
      submitLabel={session ? t('common.update') : t('common.create')}
    >
      {({ register, errors, control }) => (
        <>
          <div className="grid gap-2">
            <Label htmlFor="name">{t('sessionDialog.nameLabel')}</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder={t('sessionDialog.namePlaceholder')}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="elementLabel">{t('sessionDialog.elementLabel')}</Label>
            <Input
              id="elementLabel"
              {...register('elementLabel')}
              placeholder={t('sessionDialog.elementPlaceholder')}
            />
            <p className="text-xs text-gray-500">{t('sessionDialog.elementDescription')}</p>
            {errors.elementLabel && (
              <p className="text-sm text-red-500">{errors.elementLabel.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="colorTheme">{t('sessionDialog.colorTheme')}</Label>
            <Controller
              name="colorTheme"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-500" />
                        {t('sessionDialog.colors.basic')}
                      </div>
                    </SelectItem>
                    <SelectItem value="blue">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        {t('sessionDialog.colors.blue')}
                      </div>
                    </SelectItem>
                    <SelectItem value="red">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        {t('sessionDialog.colors.red')}
                      </div>
                    </SelectItem>
                    <SelectItem value="green">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        {t('sessionDialog.colors.green')}
                      </div>
                    </SelectItem>
                    <SelectItem value="purple">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                        {t('sessionDialog.colors.purple')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-gray-500">{t('sessionDialog.colorThemeDescription')}</p>
          </div>
        </>
      )}
    </FormDialog>
  );
}
