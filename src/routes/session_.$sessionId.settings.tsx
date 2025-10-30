import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useSession, useSessionActions } from '../hooks/useSessions';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const SessionInfoFormSchema = z.object({
  name: z.string().min(1, 'Session name is required'),
  elementLabel: z.string().min(1, 'Element label is required'),
  colorTheme: z.enum(['basic', 'blue', 'red', 'green', 'purple']),
});

type SessionInfoFormData = z.infer<typeof SessionInfoFormSchema>;

export const Route = createFileRoute('/session_/$sessionId/settings')({
  component: SessionSettingsPage,
});

function SessionSettingsPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const session = useSession(sessionId);
  const { updateSession } = useSessionActions();
  const { setColorTheme } = useTheme();

  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
  } = useForm<SessionInfoFormData>({
    resolver: zodResolver(SessionInfoFormSchema),
    defaultValues: {
      name: session?.name || '',
      elementLabel: session?.elementLabel || 'element',
      colorTheme: session?.colorTheme || 'blue',
    },
    values: session
      ? {
          name: session.name,
          elementLabel: session.elementLabel,
          colorTheme: session.colorTheme,
        }
      : undefined,
  });

  // Apply session's color theme
  useEffect(() => {
    if (session?.colorTheme) {
      setColorTheme(session.colorTheme);
    }
    setTimeout(() => {
      reset({
        colorTheme: session?.colorTheme,
      });
    }, 50);
  }, [session?.colorTheme, setColorTheme, reset]);

  const onSubmitSessionInfo = async (data: SessionInfoFormData) => {
    setIsSavingInfo(true);
    setInfoSuccess(false);
    try {
      await updateSession(sessionId, {
        name: data.name,
        elementLabel: data.elementLabel,
        colorTheme: data.colorTheme,
      });
      reset(data);
      setInfoSuccess(true);
      setTimeout(() => setInfoSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update session:', err);
    } finally {
      setIsSavingInfo(false);
    }
  };

  if (!session) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-xl font-semibold mb-2">{t('session.notFound')}</h3>
            <p className="text-gray-600 mb-6">{t('session.notFoundDescription')}</p>
            <Button onClick={() => navigate({ to: '/' })}>{t('session.goToSessions')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        {/* Desktop: Back link at the top */}
        <Link
          to="/session/$sessionId"
          params={{ sessionId }}
          className="hidden md:inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('session.header.backToSession')}
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
          <h1 className="text-3xl font-bold mb-2">{t('common.settings')}</h1>
          <p className="text-gray-600">{session.name}</p>
        </div>
      </div>

      {/* Session Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.sessionInformation')}</CardTitle>
          <CardDescription>{t('settings.sessionInformationDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmitSessionInfo)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 md:items-start">
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
            </div>

            <div className="grid gap-2">
              <Label htmlFor="colorTheme">{t('sessionDialog.colorTheme')}</Label>
              <Controller
                name="colorTheme"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full md:w-[300px]">
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

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={!isDirty || isSavingInfo}>
                <Save className="mr-2 h-4 w-4" />
                {isSavingInfo ? t('common.saving') : t('settings.saveChanges')}
              </Button>
              {infoSuccess && (
                <span className="text-sm text-green-600 font-medium">
                  {t('settings.changesSaved')}
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
