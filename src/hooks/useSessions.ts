import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Session, SessionInput } from '../db/schemas';

/**
 * Hook to get all sessions with live updates
 */
export function useSessions() {
  const sessions = useLiveQuery(async () => {
    return await db.getAllSessions();
  }, []);

  return sessions ?? [];
}

/**
 * Hook to get a single session by ID with live updates
 */
export function useSession(id: string | undefined) {
  const session = useLiveQuery(async () => {
    if (!id) return undefined;
    return await db.getSession(id);
  }, [id]);

  return session;
}

/**
 * Hook to get session with all its data (elements and attributes)
 */
export function useSessionWithData(sessionId: string | undefined) {
  const data = useLiveQuery(async () => {
    if (!sessionId) return null;
    return await db.getSessionWithData(sessionId);
  }, [sessionId]);

  return data;
}

/**
 * Hook to get element count for a session
 */
export function useSessionElementCount(sessionId: string | undefined) {
  const count = useLiveQuery(async () => {
    if (!sessionId) return 0;
    const elements = await db.getSessionElements(sessionId);
    return elements.length;
  }, [sessionId]);

  return count ?? 0;
}

/**
 * CRUD operations for sessions
 */
export function useSessionActions() {
  const addSession = async (input: SessionInput): Promise<string> => {
    return await db.addSession(input);
  };

  const updateSession = async (
    id: string,
    updates: Partial<Omit<Session, 'id'>>
  ): Promise<void> => {
    return await db.updateSession(id, updates);
  };

  const deleteSession = async (id: string): Promise<void> => {
    return await db.deleteSession(id);
  };

  return {
    addSession,
    updateSession,
    deleteSession,
  };
}
