import type { Attribute } from '@/db/schemas';

export type AttributeValue = string | number | undefined;

export type AttributeFieldProps = {
  attribute: Attribute;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any; // react-hook-form Control type
};
