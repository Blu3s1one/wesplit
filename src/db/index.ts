// Export the database instance
export { db, AppDB } from './db';

// Export all schemas and types
export {
  SessionSchema,
  ElementSchema,
  AttributeSchema,
  type Session,
  type Element,
  type Attribute,
  type SessionInput,
  type ElementInput,
  type AttributeInput,
  validateElementAttributes,
} from './schemas';
