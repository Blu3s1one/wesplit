import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useSession } from '../hooks/useSessions';
import { useElements, useElementActions } from '../hooks/useElements';
import { useAttributes } from '../hooks/useAttributes';
import { useDistributions, useDistributionActions } from '../hooks/useDistributions';
import { ElementDialog } from '../components/ElementDialog';
import { DistributionDialog } from '../components/DistributionDialog';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { SessionHeader } from '../components/session/SessionHeader';
import { AttributesInfo } from '../components/session/AttributesInfo';
import { ElementsTable } from '../components/session/ElementsTable';
import { useTranslation } from 'react-i18next';
import type { Element } from '../db/schemas';

export const Route = createFileRoute('/session/$sessionId')({
  component: SessionDetailPage,
});

function SessionDetailPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const session = useSession(sessionId);
  const elements = useElements(sessionId);
  const attributes = useAttributes(sessionId);
  const distributions = useDistributions(sessionId);
  const { addElement, updateElement, deleteElement } = useElementActions();
  const { addDistribution } = useDistributionActions();
  const { setColorTheme } = useTheme();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingElement, setEditingElement] = useState<Element | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [elementToDelete, setElementToDelete] = useState<Element | undefined>();
  const [distributionDialogOpen, setDistributionDialogOpen] = useState(false);

  // Apply session's color theme
  useEffect(() => {
    if (session?.colorTheme) {
      setColorTheme(session.colorTheme);
    }
  }, [session?.colorTheme, setColorTheme]);

  const handleAddElement = () => {
    setEditingElement(undefined);
    setDialogOpen(true);
  };

  const handleEditElement = (element: Element) => {
    setEditingElement(element);
    setDialogOpen(true);
  };

  const handleDeleteElement = (element: Element) => {
    setElementToDelete(element);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: {
    name: string;
    attributes?: Record<string, string | number | boolean>;
  }) => {
    if (editingElement) {
      await updateElement(editingElement.id, {
        name: data.name,
        attributes: data.attributes || {},
      });
    } else {
      await addElement({
        sessionId,
        name: data.name,
        attributes: data.attributes || {},
      });
    }
  };

  const confirmDelete = async () => {
    if (elementToDelete) {
      await deleteElement(elementToDelete.id);
      setDeleteDialogOpen(false);
      setElementToDelete(undefined);
    }
  };

  const handleCreateDistribution = async (data: {
    name: string;
    groupCount: number;
    constraints: any[];
  }) => {
    const { generateRandomDistribution, generateConstraintBasedDistribution } = await import(
      '../lib/distributionAlgorithms'
    );

    // Generate groups based on constraints
    // Validation happens inside generateConstraintBasedDistribution
    const groups =
      data.constraints.length > 0
        ? generateConstraintBasedDistribution(
            elements,
            data.groupCount,
            data.constraints,
            attributes
          )
        : generateRandomDistribution(elements, data.groupCount);

    const newDistId = await addDistribution({
      sessionId,
      name: data.name,
      constraints: data.constraints,
      groups,
    });

    // Navigate to the new distribution
    navigate({
      to: '/session/$sessionId/distributions/$distributionId',
      params: { sessionId, distributionId: newDistId },
    });

    setDistributionDialogOpen(false);
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
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <SessionHeader
        sessionId={sessionId}
        sessionName={session.name}
        elementLabel={session.elementLabel}
        elementsCount={elements.length}
        distributionsCount={distributions.length}
        firstDistributionId={distributions.length > 0 ? distributions[0].id : undefined}
        createdAt={session.createdAt}
        onAddElement={handleAddElement}
        onCreateDistribution={() => setDistributionDialogOpen(true)}
      />

      {/* Attributes info */}
      <AttributesInfo attributes={attributes} />

      {/* Elements table */}
      <ElementsTable
        elements={elements}
        attributes={attributes}
        elementLabel={session.elementLabel}
        onAddElement={handleAddElement}
        onEditElement={handleEditElement}
        onDeleteElement={handleDeleteElement}
      />

      <ElementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        element={editingElement}
        attributes={attributes}
        sessionId={sessionId}
        elementLabel={session.elementLabel}
        onSubmit={handleSubmit}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('elements.deleteElement')}
        description={t('elements.deleteConfirmation', { name: elementToDelete?.name || '' })}
        onConfirm={confirmDelete}
      />

      <DistributionDialog
        open={distributionDialogOpen}
        onOpenChange={setDistributionDialogOpen}
        attributes={attributes}
        onSubmit={handleCreateDistribution}
      />
    </div>
  );
}
