import { useDroppable } from '@dnd-kit/core';
import { Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { DraggableElement } from './DraggableElement';
import { calculateGroupStats } from '../../lib/distributionAlgorithms';
import { pluralize } from '../../lib/pluralize';
import { useTranslation } from 'react-i18next';
import type { Element as ElementType, Attribute } from '../../db/schemas';

interface GroupCardProps {
  group: { id: string; name: string; members: string[] };
  elements: ElementType[];
  attributes: Attribute[];
  elementLabel: string;
}

export function GroupCard({ group, elements, attributes, elementLabel }: GroupCardProps) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({
    id: `group-${group.id}`,
  });

  const stats = calculateGroupStats(group, elements, attributes);

  return (
    <Card
      ref={setNodeRef}
      className={`transition-colors ${isOver ? 'border-primary border-2 bg-primary/5' : ''}`}
    >
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          {group.name}
        </CardTitle>
        <CardDescription>
          {group.members.length} {pluralize(elementLabel, group.members.length)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        {attributes.length > 0 && (
          <div className="space-y-2 pb-3 border-b">
            {attributes.map((attr) => {
              if (attr.type === 'enum') {
                const enumStats = stats.enumStats.get(attr.id);
                if (enumStats && enumStats.size > 0) {
                  return (
                    <div key={attr.id} className="text-xs">
                      <p className="font-medium mb-1">{attr.name}:</p>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(enumStats.entries()).map(([value, count]) => (
                          <Badge key={value} variant="outline" className="text-xs">
                            {value}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                }
              } else if (attr.type === 'number') {
                const numberStats = stats.numberStats.get(attr.id);
                if (numberStats) {
                  return (
                    <div key={attr.id} className="text-xs">
                      <p className="font-medium">
                        {attr.name}: {t('distribution.avg')} {numberStats.average.toFixed(1)}
                      </p>
                    </div>
                  );
                }
              }
              return null;
            })}
          </div>
        )}

        {/* Members */}
        <div className="space-y-2 min-h-[100px]">
          {group.members.map((memberId) => {
            const element = elements.find((e) => e.id === memberId);
            if (!element) return null;
            return <DraggableElement key={element.id} element={element} />;
          })}
          {group.members.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              {t('distribution.dropElementsHere', { elementLabel: pluralize(elementLabel) })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
