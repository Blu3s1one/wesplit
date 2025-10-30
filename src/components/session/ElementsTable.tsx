import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { pluralize, capitalize } from '../../lib/pluralize';
import { useTranslation } from 'react-i18next';
import type { Element, Attribute } from '../../db/schemas';

interface ElementsTableProps {
  elements: Element[];
  attributes: Attribute[];
  elementLabel: string;
  onAddElement: () => void;
  onEditElement: (element: Element) => void;
  onDeleteElement: (element: Element) => void;
}

export function ElementsTable({
  elements,
  attributes,
  elementLabel,
  onAddElement,
  onEditElement,
  onDeleteElement,
}: ElementsTableProps) {
  const { t } = useTranslation();

  // Check if element has all required attributes filled
  const hasRequiredAttributesMissing = (element: Element) => {
    return attributes.some(
      (attr) =>
        attr.required &&
        (element.attributes[attr.id] === undefined ||
          element.attributes[attr.id] === null ||
          element.attributes[attr.id] === '')
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{capitalize(pluralize(elementLabel))}</CardTitle>
            <CardDescription>
              {t('elements.tableDescription', { elementLabel: pluralize(elementLabel) })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {elements.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">
              {t('elements.noElementsAdded', { elementLabel: pluralize(elementLabel) })}
            </p>
            <Button onClick={onAddElement}>
              <Plus className="mr-2 h-4 w-4" />
              {t('elements.addFirstElement', { elementLabel: capitalize(elementLabel) })}
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name')}</TableHead>
                  {attributes.map((attr) => (
                    <TableHead key={attr.id}>{attr.name}</TableHead>
                  ))}
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {elements.map((element) => {
                  const isMissingRequired = hasRequiredAttributesMissing(element);
                  return (
                    <TableRow key={element.id}>
                      <TableCell
                        className={`font-medium ${
                          isMissingRequired ? 'text-red-600 dark:text-red-400' : ''
                        }`}
                      >
                        {element.name}
                      </TableCell>
                      {attributes.map((attr) => {
                        const value = element.attributes[attr.id];
                        let displayValue = '-';

                        if (value !== undefined && value !== null) {
                          if (attr.type === 'attractive' || attr.type === 'repulsive') {
                            // Display checkbox icon or Yes/No for boolean attributes
                            displayValue = value === true || value === 'true' ? '✓' : '✗';
                          } else {
                            displayValue = String(value);
                          }
                        }

                        return <TableCell key={attr.id}>{displayValue}</TableCell>;
                      })}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => onEditElement(element)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteElement(element)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
