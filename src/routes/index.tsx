import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Plus, Settings, Trash2, Edit, Users, GraduationCap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSessions, useSessionActions, useSessionElementCount } from '../hooks/useSessions';
import { SessionDialog } from '../components/SessionDialog';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { pluralize } from '../lib/pluralize';
import type { Session, SessionInput } from '../db/schemas';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LanguageSwitcherCompact } from '@/components/LanguageSwitcher';
import { useTheme } from '../contexts/ThemeContext';
import { createDemoClassroom } from '../lib/demoData';
import { toast } from 'sonner';

export const Route = createFileRoute('/')({
  component: SessionsListPage,
});

function SessionsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sessions = useSessions();
  const { addSession, updateSession, deleteSession } = useSessionActions();
  const { setColorTheme } = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Session | undefined>();
  const [creatingDemo, setCreatingDemo] = useState(false);

  // Reset to basic theme on homepage
  useEffect(() => {
    setColorTheme('basic');
  }, [setColorTheme]);

  const handleCreateSession = () => {
    setEditingSession(undefined);
    setDialogOpen(true);
  };

  const handleEditSession = (session: Session) => {
    setEditingSession(session);
    setDialogOpen(true);
  };

  const handleDeleteSession = (session: Session) => {
    setSessionToDelete(session);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: SessionInput) => {
    if (editingSession) {
      await updateSession(editingSession.id, data);
    } else {
      await addSession(data);
    }
  };

  const confirmDelete = async () => {
    if (sessionToDelete) {
      await deleteSession(sessionToDelete.id);
      setDeleteDialogOpen(false);
      setSessionToDelete(undefined);
    }
  };

  const handleCreateDemo = async () => {
    setCreatingDemo(true);
    try {
      const sessionId = await createDemoClassroom();
      toast.success(t('sessions.demoCreated'), {
        description: t('sessions.demoDescription'),
      });
      // Navigate to the new session
      navigate({ to: '/session/$sessionId', params: { sessionId } });
    } catch (error) {
      console.error('Failed to create demo:', error);
      toast.error(t('sessions.demoError'), {
        description: error instanceof Error ? error.message : t('errors.genericError'),
      });
    } finally {
      setCreatingDemo(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        {/* Mobile: Action buttons on top */}
        <div className="flex items-center justify-end gap-2 mb-4 md:hidden">
          <Button onClick={handleCreateDemo} size="icon" variant="outline" disabled={creatingDemo}>
            <GraduationCap className="h-5 w-5" />
          </Button>
          <Button onClick={handleCreateSession} size="icon">
            <Plus className="h-5 w-5" />
          </Button>
          <LanguageSwitcherCompact />
          <ThemeSwitcher />
        </div>

        {/* Title - full width on mobile, flex with buttons on desktop */}
        <div className="md:flex md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('sessions.title')}</h1>
            <p className="text-gray-600">{t('sessions.description')}</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Button onClick={handleCreateDemo} size="lg" variant="outline" disabled={creatingDemo}>
              <GraduationCap className="mr-2 h-5 w-5" />
              {creatingDemo ? t('common.creating') : t('sessions.demoSession')}
            </Button>
            <Button onClick={handleCreateSession} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              {t('sessions.newSession')}
            </Button>
            <LanguageSwitcherCompact />
            <ThemeSwitcher />
          </div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <Card className="p-12 text-center">
          <CardContent className="pt-6">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Users className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{t('sessions.noSessions')}</h3>
            <p className="text-gray-600 mb-6">{t('sessions.noSessionsDescription')}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handleCreateDemo} variant="outline" disabled={creatingDemo}>
                <GraduationCap className="mr-2 h-4 w-4" />
                {creatingDemo ? t('sessions.creating') : t('sessions.tryDemoSession')}
              </Button>
              <Button onClick={handleCreateSession}>
                <Plus className="mr-2 h-4 w-4" />
                {t('sessions.createSession')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onEdit={handleEditSession}
              onDelete={handleDeleteSession}
            />
          ))}
        </div>
      )}

      <SessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        session={editingSession}
        onSubmit={handleSubmit}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('sessions.deleteSession')}
        description={t('sessions.deleteConfirmation', { name: sessionToDelete?.name })}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function SessionCard({
  session,
  onEdit,
  onDelete,
}: {
  session: Session;
  onEdit: (session: Session) => void;
  onDelete: (session: Session) => void;
}) {
  const { t } = useTranslation();
  const elementCount = useSessionElementCount(session.id);

  // Map theme to border and badge colors
  const themeColors = {
    basic: {
      border: 'border-l-gray-500',
      badge: 'bg-gray-100 text-gray-700 border-gray-300',
    },
    blue: {
      border: 'border-l-blue-500',
      badge: 'bg-blue-100 text-blue-700 border-blue-300',
    },
    red: {
      border: 'border-l-red-500',
      badge: 'bg-red-100 text-red-700 border-red-300',
    },
    green: {
      border: 'border-l-green-500',
      badge: 'bg-green-100 text-green-700 border-green-300',
    },
    purple: {
      border: 'border-l-purple-500',
      badge: 'bg-purple-100 text-purple-700 border-purple-300',
    },
  };

  const colors = themeColors[session.colorTheme || 'blue'];

  return (
    <Card className={`hover:shadow-lg transition-shadow border-l-4 ${colors.border}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Link
              to="/session/$sessionId"
              params={{ sessionId: session.id }}
              className="hover:underline"
            >
              <CardTitle className="text-xl mb-1">{session.name}</CardTitle>
            </Link>
            <CardDescription>
              {t('common.created')} {new Date(session.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={`${colors.badge} border`}>
              <Users className="h-3 w-3 mr-1" />
              {elementCount} {pluralize(session.elementLabel, elementCount)}
            </Badge>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(session)}
              title={t('common.edit')}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" title={t('common.settings')} asChild>
              <Link to="/session/$sessionId/settings" params={{ sessionId: session.id }}>
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(session)}
              title={t('common.delete')}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
