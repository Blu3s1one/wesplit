import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Element, ElementInput } from '../db/schemas';

/**
 * Hook to get all elements for a session with live updates
 */
export function useElements(sessionId: string | undefined) {
  const elements = useLiveQuery(async () => {
    if (!sessionId) return [];
    return await db.getSessionElements(sessionId);
  }, [sessionId]);

  return elements ?? [];
}

/**
 * Hook to get a single element by ID with live updates
 */
export function useElement(id: string | undefined) {
  const element = useLiveQuery(async () => {
    if (!id) return undefined;
    return await db.getElement(id);
  }, [id]);

  return element;
}

/**
 * CRUD operations for elements
 */
export function useElementActions() {
  const addElement = async (input: ElementInput): Promise<string> => {
    return await db.addElement(input);
  };

  const updateElement = async (
    id: string,
    updates: Partial<Omit<Element, 'id' | 'sessionId'>>
  ): Promise<void> => {
    return await db.updateElement(id, updates);
  };

  const deleteElement = async (id: string): Promise<void> => {
    return await db.deleteElement(id);
  };

  const bulkAddElements = async (inputs: ElementInput[]): Promise<string[]> => {
    return await db.bulkAddElements(inputs);
  };

  return {
    addElement,
    updateElement,
    deleteElement,
    bulkAddElements,
  };
}
