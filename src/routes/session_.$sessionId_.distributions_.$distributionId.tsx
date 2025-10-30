import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useSession } from '../hooks/useSessions';
import { useElements } from '../hooks/useElements';
import { useAttributes } from '../hooks/useAttributes';
import {
  useDistributions,
  useDistribution,
  useDistributionActions,
} from '../hooks/useDistributions';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { DistributionDialog } from '../components/DistributionDialog';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Sidebar, SidebarProvider, SidebarInset, SidebarRail } from '../components/ui/sidebar';
import {
  checkConstraintSatisfaction,
  generateRandomDistribution,
  generateConstraintBasedDistribution,
} from '../lib/distributionAlgorithms';
import { DistributionSidebar } from '../components/distribution/DistributionSidebar';
import { DistributionHeader } from '../components/distribution/DistributionHeader';
import { ConstraintSatisfactionCard } from '../components/distribution/ConstraintSatisfactionCard';
import { GroupCard } from '../components/distribution/GroupCard';
import type { Distribution, Element as ElementType, Constraint } from '../db/schemas';

export const Route = createFileRoute('/session_/$sessionId_/distributions_/$distributionId')({
  component: DistributionDetailPage,
});

function DistributionDetailPage() {
  const { sessionId, distributionId } = Route.useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const session = useSession(sessionId);
  const sessionElements = useElements(sessionId); // Current session elements
  const sessionAttributes = useAttributes(sessionId); // Current session attributes
  const distributions = useDistributions(sessionId);
  const distribution = useDistribution(distributionId);
  const { addDistribution, updateDistribution, deleteDistribution, updateGroupMembership } =
    useDistributionActions();
  const { setColorTheme } = useTheme();

  // Use snapshotted data from distribution if available, otherwise use current session data
  const elements = distribution?.snapshotElements || sessionElements;
  const attributes = distribution?.snapshotAttributes || sessionAttributes;

  const [activeElement, setActiveElement] = useState<ElementType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [distributionToDelete, setDistributionToDelete] = useState<Distribution | undefined>();
  const [editingDistribution, setEditingDistribution] = useState<string | undefined>();
  const [editingName, setEditingName] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createFromDistDialogOpen, setCreateFromDistDialogOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Apply session's color theme
  useEffect(() => {
    if (session?.colorTheme) {
      setColorTheme(session.colorTheme);
    }
  }, [session?.colorTheme, setColorTheme]);

  const handleDragStart = (event: DragStartEvent) => {
    const element = elements.find((e) => e.id === event.active.id);
    setActiveElement(element || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveElement(null);
      return;
    }

    // Extract groupId from droppable id (format: "group-{groupId}")
    const groupId = String(over.id).replace('group-', '');
    const elementId = String(active.id);

    try {
      await updateGroupMembership(distributionId, elementId, groupId);

      // After the move, check if constraints are now violated
      if (distribution) {
        // Use snapshot data for constraint checking
        const snapshotElements = distribution.snapshotElements || elements;
        const snapshotAttributes = distribution.snapshotAttributes || attributes;

        // Create updated groups with the move
        const updatedGroups = distribution.groups.map((g) => {
          // Remove element from its current group
          const members = g.members.filter((m) => m !== elementId);
          // Add element to target group
          if (g.id === groupId) {
            members.push(elementId);
          }
          return { ...g, members };
        });

        // Check all constraints (not just mandatory)
        const { satisfied, issues } = checkConstraintSatisfaction(
          updatedGroups,
          snapshotElements,
          distribution.constraints,
          snapshotAttributes
        );

        if (!satisfied && issues.length > 0) {
          // Show warning toast for constraint violations
          toast.warning(t('distribution.constraintViolated'), {
            description: issues[0],
            duration: 5000,
          });
        }
      }
    } catch (error) {
      console.error('Failed to update group membership:', error);
      toast.error(t('distribution.failedToMoveElement'), {
        description: t('distribution.updateGroupError'),
      });
    }

    setActiveElement(null);
  };

  const handleDeleteDistribution = (dist: Distribution) => {
    setDistributionToDelete(dist);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (distributionToDelete) {
      await deleteDistribution(distributionToDelete.id);
      setDeleteDialogOpen(false);
      setDistributionToDelete(undefined);

      // Navigate to first remaining distribution or back to session
      const remaining = distributions.filter((d) => d.id !== distributionToDelete.id);
      if (remaining.length > 0) {
        navigate({
          to: '/session/$sessionId/distributions/$distributionId',
          params: { sessionId, distributionId: remaining[0].id },
        });
      } else {
        navigate({ to: '/session/$sessionId', params: { sessionId } });
      }
    }
  };

  const handleEditName = (dist: Distribution) => {
    setEditingDistribution(dist.id);
    setEditingName(dist.name);
  };

  const handleSaveName = async (distId: string) => {
    if (editingName.trim()) {
      await updateDistribution(distId, { name: editingName.trim() });
    }
    setEditingDistribution(undefined);
  };

  const handleCreateDistribution = async (data: {
    name: string;
    groupCount: number;
    constraints: Constraint[];
  }) => {
    // Generate groups based on constraints
    const groups =
      data.constraints.length > 0
        ? generateConstraintBasedDistribution(
            sessionElements,
            data.groupCount,
            data.constraints,
            sessionAttributes
          )
        : generateRandomDistribution(sessionElements, data.groupCount);

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

    setCreateDialogOpen(false);
  };

  const handleCreateFromDistribution = async (data: {
    name: string;
    groupCount: number;
    constraints: Constraint[];
  }) => {
    // Use the snapshotted elements and attributes from the current distribution
    const snapshotElements = distribution?.snapshotElements || [];
    const snapshotAttributes = distribution?.snapshotAttributes || [];

    // Generate groups based on constraints using snapshot data
    const groups =
      data.constraints.length > 0
        ? generateConstraintBasedDistribution(
            snapshotElements,
            data.groupCount,
            data.constraints,
            snapshotAttributes
          )
        : generateRandomDistribution(snapshotElements, data.groupCount);

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

    setCreateFromDistDialogOpen(false);
  };

  const handleRegenerateDistribution = async () => {
    if (!distribution) return;

    setIsRegenerating(true);
    try {
      // Use the snapshotted elements and attributes from the current distribution
      const snapshotElements = distribution.snapshotElements || [];
      const snapshotAttributes = distribution.snapshotAttributes || [];

      // Generate new groups based on existing constraints using snapshot data
      const groups =
        distribution.constraints.length > 0
          ? generateConstraintBasedDistribution(
              snapshotElements,
              distribution.groups.length,
              distribution.constraints,
              snapshotAttributes
            )
          : generateRandomDistribution(snapshotElements, distribution.groups.length);

      // Update the current distribution with new groups
      await updateDistribution(distributionId, { groups });

      toast.success(t('distribution.regenerated'), {
        description: t('distribution.regeneratedDescription'),
      });
    } catch (error) {
      console.error('Failed to regenerate distribution:', error);
      toast.error(t('distribution.failedToRegenerate'), {
        description: error instanceof Error ? error.message : t('errors.genericError'),
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!session) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-xl font-semibold mb-2">{t('session.notFound')}</h3>
            <Button onClick={() => navigate({ to: '/' })}>{t('session.goToSessions')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!distribution) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-xl font-semibold mb-2">{t('distribution.notFound')}</h3>
            <Button onClick={() => navigate({ to: '/session/$sessionId', params: { sessionId } })}>
              {t('common.backToSession')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate constraint satisfaction
  const constraintCheck = checkConstraintSatisfaction(
    distribution.groups,
    elements,
    distribution.constraints,
    attributes
  );

  return (
    <SidebarProvider defaultOpen={false}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex h-screen w-full bg-background">
          {/* Sidebar - Distribution List */}
          <Sidebar collapsible="icon">
            <DistributionSidebar
              distributions={distributions}
              sessionId={sessionId}
              distributionId={distributionId}
              editingDistribution={editingDistribution}
              editingName={editingName}
              setEditingName={setEditingName}
              handleEditName={handleEditName}
              handleSaveName={handleSaveName}
              handleDeleteDistribution={handleDeleteDistribution}
              setEditingDistribution={setEditingDistribution}
              setCreateDialogOpen={setCreateDialogOpen}
              navigate={navigate}
            />
            <SidebarRail className="after:hidden opacity-30 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center bg-background/80 hover:bg-background rounded-l-lg"></SidebarRail>
          </Sidebar>

          {/* Main Content - Distribution Details */}
          <SidebarInset className="flex-1 overflow-y-auto">
            <div className="container mx-auto p-6 max-w-7xl">
              {/* Header */}
              <DistributionHeader
                distributionName={distribution.name}
                sessionName={session.name}
                groupCount={distribution.groups.length}
                isRegenerating={isRegenerating}
                onRegenerate={handleRegenerateDistribution}
                onCreateFromDistribution={() => setCreateFromDistDialogOpen(true)}
              />

              {/* Constraint Satisfaction Indicator */}
              <ConstraintSatisfactionCard
                distribution={distribution}
                elements={elements}
                attributes={attributes}
                constraintCheck={constraintCheck}
              />

              {/* Groups */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {distribution.groups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    elements={elements}
                    attributes={attributes}
                    elementLabel={session.elementLabel}
                  />
                ))}
              </div>
            </div>
          </SidebarInset>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeElement ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border-2 border-primary">
              <p className="font-medium">{activeElement.name}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('distribution.deleteDistribution')}
        description={t('distribution.deleteConfirmation', {
          name: distributionToDelete?.name || '',
        })}
        onConfirm={confirmDelete}
      />

      <DistributionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        attributes={sessionAttributes}
        onSubmit={handleCreateDistribution}
      />

      <DistributionDialog
        open={createFromDistDialogOpen}
        onOpenChange={setCreateFromDistDialogOpen}
        attributes={attributes}
        onSubmit={handleCreateFromDistribution}
      />
    </SidebarProvider>
  );
}
