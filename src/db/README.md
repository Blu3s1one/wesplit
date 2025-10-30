# Database Schema Documentation

This directory contains the Dexie database setup with Zod validation for the Split app.

## Overview

The database consists of three main entities:

- **Sessions**: Container for group distribution scenarios
- **Attributes**: Custom properties that can be defined per session
- **Elements**: Items to be distributed (e.g., students, participants)

All entities are validated using **Zod schemas** before insertion to ensure data integrity.

## Entities

### Session

A session represents a group distribution scenario.

```typescript
interface Session {
  id: string; // Unique identifier
  name: string; // Session name
  createdAt: Date; // Creation timestamp
  attributes: string[]; // Array of attribute IDs
  settings?: {
    // Optional distribution settings
    groupCount?: number; // Number of groups to create
    constraints?: Record<string, any>; // Constraint configurations
  };
}
```

**Zod Schema**: `SessionSchema`

### Attribute

Attributes define custom properties for elements within a session.

```typescript
interface Attribute {
  id: string; // Unique identifier
  sessionId: string; // Parent session ID
  name: string; // Attribute name
  type: 'enum' | 'number'; // Attribute type
  required: boolean; // Whether this attribute is required
  options?: string[]; // For enum: available options
  min?: number; // For number: minimum value
  max?: number; // For number: maximum value
}
```

**Zod Schema**: `AttributeSchema`

**Validation Rules**:

- Enum attributes must have at least one option
- Number attributes can have optional min/max constraints

### Element

Elements represent the items to be distributed into groups.

```typescript
interface Element {
  id: string; // Unique identifier
  sessionId: string; // Parent session ID
  name: string; // Element name
  attributes: Record<string, string | number>; // Map of attributeId → value
}
```

**Zod Schema**: `ElementSchema`

**Validation Rules**:

- All required attributes must have values
- Enum attribute values must be one of the defined options
- Number attribute values must respect min/max constraints

## Usage

### Import

```typescript
import { db } from '@/db';
import type { SessionInput, AttributeInput, ElementInput } from '@/db';
```

### Create a Session

```typescript
const sessionId = await db.addSession({
  name: 'Math Class Groups',
  settings: {
    groupCount: 5,
  },
});
```

### Define Attributes

```typescript
// Enum attribute
const genderId = await db.addAttribute({
  sessionId,
  name: 'Gender',
  type: 'enum',
  required: true,
  options: ['Male', 'Female', 'Other'],
});

// Numeric attribute
const gradeId = await db.addAttribute({
  sessionId,
  name: 'Average Grade',
  type: 'number',
  required: false,
  min: 0,
  max: 20,
});
```

### Add Elements

```typescript
await db.addElement({
  sessionId,
  name: 'Alice Johnson',
  attributes: {
    [genderId]: 'Female',
    [gradeId]: 18.5,
  },
});

// Bulk add
await db.bulkAddElements([
  { sessionId, name: 'Bob', attributes: { [genderId]: 'Male', [gradeId]: 15 } },
  { sessionId, name: 'Charlie', attributes: { [genderId]: 'Male', [gradeId]: 17 } },
]);
```

### Retrieve Data

```typescript
// Get session with all related data
const data = await db.getSessionWithData(sessionId);
// Returns: { session, elements, attributes }

// Get specific entities
const session = await db.getSession(sessionId);
const elements = await db.getSessionElements(sessionId);
const attributes = await db.getSessionAttributes(sessionId);
```

### Update Data

```typescript
// Update session
await db.updateSession(sessionId, {
  name: 'Updated Session Name',
  settings: { groupCount: 6 },
});

// Update element
await db.updateElement(elementId, {
  name: 'Updated Name',
  attributes: { [attrId]: 'New Value' },
});

// Update attribute
await db.updateAttribute(attrId, {
  name: 'Updated Attribute',
  options: ['Option1', 'Option2'],
});
```

### Delete Data

```typescript
// Delete session (cascades to elements and attributes)
await db.deleteSession(sessionId);

// Delete attribute (removes from session and all elements)
await db.deleteAttribute(attrId);

// Delete element
await db.deleteElement(elementId);

// Delete all elements in a session
await db.deleteSessionElements(sessionId);
```

## Validation

All data is validated using Zod before insertion:

1. **Schema Validation**: Each entity is validated against its Zod schema
2. **Attribute Validation**: Elements are validated against session attributes
3. **Type Safety**: TypeScript types are inferred from Zod schemas

### Validation Errors

Invalid data will throw an error with a descriptive message:

```typescript
try {
  await db.addElement({
    sessionId,
    name: 'Invalid',
    attributes: {
      [genderId]: 'InvalidValue', // Not in options
    },
  });
} catch (error) {
  // Error: Element validation failed: Invalid value for "Gender"...
}
```

## React Integration

Use `dexie-react-hooks` for reactive queries:

```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';

function SessionList() {
  const sessions = useLiveQuery(() => db.getAllSessions());

  if (!sessions) return <div>Loading...</div>;

  return (
    <ul>
      {sessions.map(session => (
        <li key={session.id}>{session.name}</li>
      ))}
    </ul>
  );
}
```

## Example

See `example-usage.ts` for a complete example demonstrating all CRUD operations.

## Database Schema Version

Current version: **1**

Schema definition:

```typescript
db.version(1).stores({
  sessions: 'id, name, createdAt',
  elements: 'id, sessionId, name',
  attributes: 'id, sessionId, name, type',
});
```

## Migration Notes

To add a new database version in the future:

```typescript
// In db.ts constructor
this.version(1).stores({
  // Current schema
});

this.version(2)
  .stores({
    // Updated schema
  })
  .upgrade((tx) => {
    // Migration logic
  });
```
