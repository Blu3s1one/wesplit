import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSession } from '../hooks/useSessions';
import { useAttributes, useAttributeActions } from '../hooks/useAttributes';
import { AttributeDialog } from '../components/AttributeDialog';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { AttributesHeader } from '../components/attributes/AttributesHeader';
import { AttributesTable } from '../components/attributes/AttributesTable';
import type { Attribute, AttributeInput } from '../db/schemas';

export const Route = createFileRoute('/session_/$sessionId/attributes')({
  component: SessionAttributesPage,
});

function SessionAttributesPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const session = useSession(sessionId);
  const attributes = useAttributes(sessionId);
  const { addAttribute, updateAttribute, deleteAttribute } = useAttributeActions();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attributeToDelete, setAttributeToDelete] = useState<Attribute | undefined>();

  const handleAddAttribute = () => {
    setEditingAttribute(undefined);
    setDialogOpen(true);
  };

  const handleEditAttribute = (attribute: Attribute) => {
    setEditingAttribute(attribute);
    setDialogOpen(true);
  };

  const handleDeleteAttribute = (attribute: Attribute) => {
    setAttributeToDelete(attribute);
    setDeleteDialogOpen(true);
  };

  const handleAttributeSubmit = async (data: AttributeInput) => {
    if (editingAttribute) {
      await updateAttribute(editingAttribute.id, {
        name: data.name,
        type: data.type,
        required: data.required,
        ...(data.type === 'enum' ? { options: data.options } : {}),
        ...(data.type === 'number'
          ? {
              min: data.min,
              max: data.max,
            }
          : {}),
      });
    } else {
      await addAttribute(data);
    }
  };

  const confirmDelete = async () => {
    if (attributeToDelete) {
      await deleteAttribute(attributeToDelete.id);
      setDeleteDialogOpen(false);
      setAttributeToDelete(undefined);
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
      <AttributesHeader sessionId={sessionId} sessionName={session.name} />

      {/* Info card */}
      <Card className="mb-6 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
        <CardContent>
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-900 dark:text-gray-100">
              <p className="font-semibold mb-1">{t('attributes.aboutAttributes')}</p>
              <p>
                {t('attributes.aboutAttributesDescription', { elementLabel: session.elementLabel })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attributes table */}
      <AttributesTable
        attributes={attributes}
        elementLabel={session.elementLabel}
        onAddAttribute={handleAddAttribute}
        onEditAttribute={handleEditAttribute}
        onDeleteAttribute={handleDeleteAttribute}
      />

      <AttributeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        attribute={editingAttribute}
        sessionId={sessionId}
        onSubmit={handleAttributeSubmit}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('attributes.deleteAttribute')}
        description={t('attributes.deleteConfirmationExtended', {
          name: attributeToDelete?.name || '',
          elementLabel: session.elementLabel,
        })}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
