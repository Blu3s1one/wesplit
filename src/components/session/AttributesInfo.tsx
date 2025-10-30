import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useTranslation } from 'react-i18next';
import type { Attribute } from '../../db/schemas';

interface AttributesInfoProps {
  attributes: Attribute[];
}

export function AttributesInfo({ attributes }: AttributesInfoProps) {
  const { t } = useTranslation();

  if (attributes.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">{t('attributes.definedAttributes')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {attributes.map((attr) => (
            <Badge key={attr.id} variant="outline">
              {attr.name}
              <span className="ml-1 text-xs text-gray-500">
                ({attr.type}
                {attr.required && `, ${t('common.required')}`})
              </span>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
