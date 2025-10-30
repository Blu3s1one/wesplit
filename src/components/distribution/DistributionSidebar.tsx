import { Link } from '@tanstack/react-router';
import { ArrowLeft, Plus, Edit2, Trash2, Users } from 'lucide-react';
import { SidebarContent, SidebarHeader, useSidebar } from '../ui/sidebar';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { pluralize } from '../../lib/pluralize';
import { useTranslation } from 'react-i18next';
import type { Distribution } from '../../db/schemas';

interface DistributionSidebarProps {
  distributions: Distribution[];
  sessionId: string;
  distributionId: string;
  editingDistribution: string | undefined;
  editingName: string;
  setEditingName: (name: string) => void;
  handleEditName: (dist: Distribution) => void;
  handleSaveName: (distId: string) => void;
  handleDeleteDistribution: (dist: Distribution) => void;
  setEditingDistribution: (id: string | undefined) => void;
  setCreateDialogOpen: (open: boolean) => void;
  navigate: any;
}

export function DistributionSidebar({
  distributions,
  sessionId,
  distributionId,
  editingDistribution,
  editingName,
  setEditingName,
  handleEditName,
  handleSaveName,
  handleDeleteDistribution,
  setEditingDistribution,
  setCreateDialogOpen,
  navigate,
}: DistributionSidebarProps) {
  const { state, isMobile } = useSidebar();
  const { t } = useTranslation();
  const isCollapsed = state === 'collapsed' && !isMobile;

  return (
    <>
      <SidebarHeader className="border-b p-4">
        {!isCollapsed ? (
          <>
            <Link
              to="/session/$sessionId"
              params={{ sessionId }}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-3"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t('common.backToSession')}
            </Link>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('distribution.title')}</h2>
              <Button size="sm" variant="ghost" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/session/$sessionId"
                  params={{ sessionId }}
                  className="p-2 hover:bg-accent rounded-md transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                {t('common.backToSession')}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCreateDialogOpen(true)}
                  className="p-2"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                {t('distribution.newDistribution')}
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        <div className={'space-y-2'}>
          {distributions.map((dist) =>
            isCollapsed ? (
              <Tooltip key={dist.id}>
                <TooltipTrigger asChild>
                  <div
                    className={`w-full h-12 rounded-md cursor-pointer transition-all hover:scale-105 flex items-center justify-center ${
                      dist.id === distributionId
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent hover:bg-accent/80'
                    }`}
                    onClick={() => {
                      navigate({
                        to: '/session/$sessionId/distributions/$distributionId',
                        params: { sessionId, distributionId: dist.id },
                      });
                    }}
                  >
                    <Users className="h-4 w-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  {dist.name}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Card
                key={dist.id}
                className={`cursor-pointer transition-colors ${
                  dist.id === distributionId
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-accent border-border'
                }`}
                onClick={() => {
                  navigate({
                    to: '/session/$sessionId/distributions/$distributionId',
                    params: { sessionId, distributionId: dist.id },
                  });
                }}
              >
                <CardContent className="p-4">
                  {editingDistribution === dist.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleSaveName(dist.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName(dist.id);
                          if (e.key === 'Escape') setEditingDistribution(undefined);
                        }}
                        autoFocus
                        className="h-8"
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold">{dist.name}</h3>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditName(dist);
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDistribution(dist);
                            }}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(dist.createdAt).toLocaleDateString()} • {dist.groups.length}{' '}
                        {pluralize('group', dist.groups.length)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          )}
        </div>
      </SidebarContent>
    </>
  );
}
