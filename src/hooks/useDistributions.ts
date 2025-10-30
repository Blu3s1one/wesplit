import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Distribution, DistributionInput } from '../db/schemas';

/**
 * Hook to get all distributions for a session with live updates
 */
export function useDistributions(sessionId: string | undefined) {
  const distributions = useLiveQuery(async () => {
    if (!sessionId) return [];
    return await db.getSessionDistributions(sessionId);
  }, [sessionId]);

  return distributions ?? [];
}

/**
 * Hook to get a single distribution by ID with live updates
 */
export function useDistribution(id: string | undefined) {
  const distribution = useLiveQuery(async () => {
    if (!id) return undefined;
    return await db.getDistribution(id);
  }, [id]);

  return distribution;
}

/**
 * CRUD operations for distributions
 */
export function useDistributionActions() {
  const addDistribution = async (input: DistributionInput): Promise<string> => {
    return await db.addDistribution(input);
  };

  const updateDistribution = async (
    id: string,
    updates: Partial<Omit<Distribution, 'id' | 'sessionId' | 'createdAt'>>
  ): Promise<void> => {
    return await db.updateDistribution(id, updates);
  };

  const deleteDistribution = async (id: string): Promise<void> => {
    return await db.deleteDistribution(id);
  };

  const updateGroupMembership = async (
    distributionId: string,
    elementId: string,
    newGroupId: string
  ): Promise<void> => {
    return await db.updateGroupMembership(distributionId, elementId, newGroupId);
  };

  return {
    addDistribution,
    updateDistribution,
    deleteDistribution,
    updateGroupMembership,
  };
}
