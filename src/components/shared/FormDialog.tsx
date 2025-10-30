import { useState, useEffect, type ReactNode } from 'react';
import { useForm, type Control, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import type { ZodType } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';

interface FormDialogProps<TFormData extends FieldValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  defaultValues: TFormData;
  schema: ZodType<TFormData>;
  onSubmit: (data: TFormData) => Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children: (props: {
    control: Control<TFormData>;
    register: ReturnType<typeof useForm<TFormData>>['register'];
    errors: ReturnType<typeof useForm<TFormData>>['formState']['errors'];
    watch: ReturnType<typeof useForm<TFormData>>['watch'];
    setValue: ReturnType<typeof useForm<TFormData>>['setValue'];
    isSubmitting: boolean;
  }) => ReactNode;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

/**
 * Reusable FormDialog component that handles common dialog form patterns:
 * - Form state management with react-hook-form
 * - Zod schema validation
 * - Loading/submitting states
 * - Error handling
 * - Consistent reset behavior on open/close
 */
export function FormDialog<TFormData extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  defaultValues,
  schema,
  onSubmit,
  submitLabel,
  cancelLabel,
  maxWidth = 'md',
  children,
}: FormDialogProps<TFormData>) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<TFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultValues: defaultValues as any,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
    setValue,
  } = form;

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setError(null);
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  const onSubmitForm = async (data: TFormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(data);
      onOpenChange(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.genericError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${maxWidthClasses[maxWidth]} max-h-[80vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmitForm)}>
          <div className="grid gap-4 py-4">
            {children({
              control,
              register,
              errors,
              watch,
              setValue,
              isSubmitting,
            })}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              {cancelLabel || t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.saving') : submitLabel || t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
