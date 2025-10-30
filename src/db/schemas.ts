import { z } from 'zod';

// ==================== Attribute Schema ====================
export const AttributeSchema = z
  .object({
    id: z.string(),
    sessionId: z.string(),
    name: z.string().min(1, 'Attribute name is required'),
    type: z.enum(['enum', 'number', 'attractive', 'repulsive']),
    required: z.boolean().default(false),
    // For enum type only
    options: z.array(z.string()).optional(),
    // For number type
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .refine(
    (data) => {
      // If type is enum, options must be provided and non-empty
      if (data.type === 'enum') {
        return data.options && data.options.length > 0;
      }
      return true;
    },
    {
      message: 'Enum attributes must have at least one option',
      path: ['options'],
    }
  )
  .refine(
    (data) => {
      // Attractive and repulsive attributes cannot be required
      if ((data.type === 'attractive' || data.type === 'repulsive') && data.required) {
        return false;
      }
      return true;
    },
    {
      message: 'Attractive and repulsive attributes cannot be marked as required',
      path: ['required'],
    }
  );

export type Attribute = z.infer<typeof AttributeSchema>;

// ==================== Session Schema ====================
export const SessionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Session name is required'),
  elementLabel: z.string().min(1, 'Element label is required').default('element'),
  colorTheme: z.enum(['basic', 'blue', 'red', 'green', 'purple']).default('basic'),
  createdAt: z.date(),
  attributes: z.array(z.string()).default([]), // Array of attribute IDs
  settings: z
    .object({
      groupCount: z.number().positive().optional(),
      constraints: z.record(z.string(), z.any()).optional(), // Map of attributeId → constraint config
    })
    .optional(),
});

export type Session = z.infer<typeof SessionSchema>;

// ==================== Element Schema ====================
export const ElementSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  name: z.string().min(1, 'Element name is required'),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}), // Map: attributeId → value
});

export type Element = z.infer<typeof ElementSchema>;

// ==================== Distribution Schema ====================

// Group type for distributions
export const GroupSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Group name is required'),
  members: z.array(z.string()), // Array of element IDs
});

export type Group = z.infer<typeof GroupSchema>;

// Constraint types for distribution generation
export const EnumConstraintSchema = z.object({
  type: z.literal('enum'),
  attributeId: z.string(),
  mode: z.enum(['balance', 'exclude']).default('balance'), // 'balance' = fair distribution, 'exclude' = different values cannot be in same group
  mandatory: z.boolean().default(false), // If true (and mode=exclude), constraint must be satisfied
  allowedDivergence: z.number().min(0).max(1).default(0.2), // For balance mode: 0 = strict balance, 1 = 100% divergence
});

export const NumberConstraintSchema = z.object({
  type: z.literal('number'),
  attributeId: z.string(),
  balanceAverage: z.boolean().default(true), // Balance numeric averages across groups
  allowedDivergence: z.number().min(0).max(1).default(0.2), // 0 = no divergence, 1 = 100% divergence
});

export const AttractiveConstraintSchema = z.object({
  type: z.literal('attractive'),
  attributeId: z.string(),
  mandatory: z.boolean().default(false), // If true, same values MUST be together
  // Same values should be in the same group (maximize homogeneity)
});

export const RepulsiveConstraintSchema = z.object({
  type: z.literal('repulsive'),
  attributeId: z.string(),
  mandatory: z.boolean().default(false), // If true, same values MUST be separated
  // Same values should be in different groups (maximize heterogeneity)
});

export const DefaultConstraintSchema = z.object({
  type: z.literal('default'),
  balanceGroupSizes: z.boolean().default(true), // Balance the number of elements per group
  allowedDivergence: z.number().min(0).max(1).default(0.2), // 0 = strict balance, 1 = 100% divergence
  // Note: This constraint doesn't have an attributeId and cannot be mandatory
});

export const ConstraintSchema = z.discriminatedUnion('type', [
  EnumConstraintSchema,
  NumberConstraintSchema,
  AttractiveConstraintSchema,
  RepulsiveConstraintSchema,
  DefaultConstraintSchema,
]);

export type Constraint = z.infer<typeof ConstraintSchema>;

export const DistributionSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  name: z.string().min(1, 'Distribution name is required').default('Distribution #1'),
  createdAt: z.date(),
  constraints: z.array(ConstraintSchema).default([]),
  groups: z.array(GroupSchema).default([]),
  // Snapshots of data at the time of distribution creation
  snapshotAttributes: z.array(AttributeSchema).default([]), // Attributes as they were
  snapshotElements: z.array(ElementSchema).default([]), // Elements as they were
});

export type Distribution = z.infer<typeof DistributionSchema>;

// ==================== Helper Types ====================

// For creating new entities (without id, auto-generated fields)
export type SessionInput = Omit<z.input<typeof SessionSchema>, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: Date;
};

export type ElementInput = Omit<z.input<typeof ElementSchema>, 'id'> & {
  id?: string;
};

export type AttributeInput = Omit<z.input<typeof AttributeSchema>, 'id'> & {
  id?: string;
};

export type DistributionInput = Omit<z.input<typeof DistributionSchema>, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: Date;
};

// ==================== Validation Helpers ====================

/**
 * Validates an element's attributes against the session's attribute definitions
 */
export function validateElementAttributes(
  element: Element,
  attributes: Attribute[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required attributes
  for (const attr of attributes) {
    if (attr.required && !element.attributes[attr.id]) {
      errors.push(`Required attribute "${attr.name}" is missing`);
    }
  }

  // Validate attribute values
  for (const [attrId, value] of Object.entries(element.attributes)) {
    const attr = attributes.find((a) => a.id === attrId);

    if (!attr) {
      errors.push(`Unknown attribute ID: ${attrId}`);
      continue;
    }

    // Validate based on type
    if (attr.type === 'enum') {
      if (typeof value !== 'string' || !attr.options?.includes(value)) {
        errors.push(
          `Invalid value for "${attr.name}". Must be one of: ${attr.options?.join(', ')}`
        );
      }
    } else if (attr.type === 'number') {
      if (typeof value !== 'number') {
        errors.push(`Invalid value for "${attr.name}". Must be a number`);
      } else {
        if (attr.min !== undefined && value < attr.min) {
          errors.push(`Value for "${attr.name}" must be at least ${attr.min}`);
        }
        if (attr.max !== undefined && value > attr.max) {
          errors.push(`Value for "${attr.name}" must be at most ${attr.max}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
