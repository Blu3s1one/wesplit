import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Attribute, AttributeInput } from '../db/schemas';

/**
 * Hook to get all attributes for a session with live updates
 */
export function useAttributes(sessionId: string | undefined) {
  const attributes = useLiveQuery(async () => {
    if (!sessionId) return [];
    return await db.getSessionAttributes(sessionId);
  }, [sessionId]);

  return attributes ?? [];
}

/**
 * Hook to get a single attribute by ID with live updates
 */
export function useAttribute(id: string | undefined) {
  const attribute = useLiveQuery(async () => {
    if (!id) return undefined;
    return await db.getAttribute(id);
  }, [id]);

  return attribute;
}

/**
 * CRUD operations for attributes
 */
export function useAttributeActions() {
  const addAttribute = async (input: AttributeInput): Promise<string> => {
    return await db.addAttribute(input);
  };

  const updateAttribute = async (
    id: string,
    updates: Partial<Omit<Attribute, 'id' | 'sessionId'>>
  ): Promise<void> => {
    return await db.updateAttribute(id, updates);
  };

  const deleteAttribute = async (id: string): Promise<void> => {
    return await db.deleteAttribute(id);
  };

  return {
    addAttribute,
    updateAttribute,
    deleteAttribute,
  };
}
