# Database Quick Start Guide

## Import

```typescript
import { db } from '@/db';
import type { SessionInput, ElementInput, AttributeInput } from '@/db';
```

## Basic Usage

### 1. Create a Session

```typescript
const sessionId = await db.addSession({
  name: 'My Session',
  settings: { groupCount: 5 },
});
```

### 2. Add Attributes

**Enum Attribute:**

```typescript
const genderId = await db.addAttribute({
  sessionId,
  name: 'Gender',
  type: 'enum',
  required: true,
  options: ['Male', 'Female', 'Other'],
});
```

**Numeric Attribute:**

```typescript
const gradeId = await db.addAttribute({
  sessionId,
  name: 'Grade',
  type: 'number',
  required: false,
  min: 0,
  max: 20,
});
```

### 3. Add Elements

```typescript
await db.addElement({
  sessionId,
  name: 'Alice',
  attributes: {
    [genderId]: 'Female',
    [gradeId]: 18.5,
  },
});
```

### 4. Get Data

```typescript
// Get everything for a session
const data = await db.getSessionWithData(sessionId);
console.log(data.session);
console.log(data.attributes);
console.log(data.elements);

// Or get individually
const session = await db.getSession(sessionId);
const elements = await db.getSessionElements(sessionId);
const attributes = await db.getSessionAttributes(sessionId);
```

### 5. Update

```typescript
await db.updateSession(sessionId, { name: 'New Name' });
await db.updateElement(elementId, { name: 'New Name' });
await db.updateAttribute(attrId, { options: ['A', 'B', 'C'] });
```

### 6. Delete

```typescript
await db.deleteSession(sessionId); // Cascades!
await db.deleteElement(elementId);
await db.deleteAttribute(attrId); // Removes from all elements!
```

## React Integration

```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';

function MyComponent() {
  // Auto-updates when database changes!
  const sessions = useLiveQuery(() => db.getAllSessions());

  if (!sessions) return <div>Loading...</div>;

  return (
    <ul>
      {sessions.map(s => <li key={s.id}>{s.name}</li>)}
    </ul>
  );
}
```

## Common Patterns

### Bulk Operations

```typescript
const elementIds = await db.bulkAddElements([
  { sessionId, name: 'Person 1', attributes: { ... } },
  { sessionId, name: 'Person 2', attributes: { ... } },
  { sessionId, name: 'Person 3', attributes: { ... } }
]);
```

### Error Handling

```typescript
try {
  await db.addElement({
    sessionId,
    name: 'Test',
    attributes: {
      [attrId]: 'InvalidValue', // Will fail validation
    },
  });
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

## Validation Rules

### Attribute Validation

- **Enum**: Value must be in `options` array
- **Number**: Value must be between `min` and `max` (if specified)
- **Required**: Must have a value if `required: true`

### Schema Validation

- All entities validated with Zod before insertion
- Invalid data throws descriptive errors
- Types enforced at runtime

## Testing

Run tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test -- --watch
```

## More Information

- Full documentation: `src/db/README.md`
- Complete example: `src/db/example-usage.ts`
- Test examples: `src/db/db.test.ts`
- Database setup info: `DATABASE_SETUP.md`
