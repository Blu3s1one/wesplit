import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';
import type { Attribute } from '../../db/schemas';

interface AttributesTableProps {
  attributes: Attribute[];
  elementLabel: string;
  onAddAttribute: () => void;
  onEditAttribute: (attribute: Attribute) => void;
  onDeleteAttribute: (attribute: Attribute) => void;
}

export function AttributesTable({
  attributes,
  elementLabel,
  onAddAttribute,
  onEditAttribute,
  onDeleteAttribute,
}: AttributesTableProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('attributes.title')}</CardTitle>
            <CardDescription>{t('attributes.tableDescription', { elementLabel })}</CardDescription>
          </div>
          <Button onClick={onAddAttribute}>
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t('attributes.addAttribute')}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {attributes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">{t('attributes.noAttributesDefined')}</p>
            <Button onClick={onAddAttribute}>
              <Plus className="mr-2 h-4 w-4" />
              {t('attributes.addFirstAttribute')}
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('attributes.type')}</TableHead>
                <TableHead>{t('common.required')}</TableHead>
                <TableHead>{t('attributes.configuration')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attributes.map((attribute) => (
                <TableRow key={attribute.id}>
                  <TableCell className="font-medium">{attribute.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{attribute.type}</Badge>
                  </TableCell>
                  <TableCell>
                    {attribute.required ? (
                      <Badge variant="default" className="bg-blue-600">
                        {t('common.yes')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{t('common.no')}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {attribute.type === 'enum' && attribute.options && (
                      <div className="flex flex-wrap gap-1">
                        {attribute.options.slice(0, 3).map((option) => (
                          <Badge key={option} variant="secondary" className="text-xs">
                            {option}
                          </Badge>
                        ))}
                        {attribute.options.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            {t('attributes.moreOptions', { count: attribute.options.length - 3 })}
                          </Badge>
                        )}
                      </div>
                    )}
                    {attribute.type === 'number' && (
                      <span className="text-sm text-gray-600">
                        {attribute.min !== undefined &&
                          t('attributes.minValue', { min: attribute.min })}
                        {attribute.min !== undefined && attribute.max !== undefined && ', '}
                        {attribute.max !== undefined &&
                          t('attributes.maxValue', { max: attribute.max })}
                        {attribute.min === undefined && attribute.max === undefined && (
                          <span className="text-gray-400">{t('attributes.noConstraints')}</span>
                        )}
                      </span>
                    )}
                    {(attribute.type === 'attractive' || attribute.type === 'repulsive') && (
                      <span className="text-sm text-gray-500 italic">
                        {t('attributes.booleanCheckbox')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onEditAttribute(attribute)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteAttribute(attribute)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
