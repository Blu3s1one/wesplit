import { useMemo } from 'react';
import { divergenceValueToLevel, DIVERGENCE_LEVELS } from '../lib/utils';
import type { Element, Distribution } from '../db/schemas';

export interface DivergenceResult {
  current: number | null;
  isWithinLimit: (allowedDivergence: number) => boolean;
}

/**
 * Helper function to create a DivergenceResult with consistent isWithinLimit logic
 */
function createDivergenceResult(currentDivergence: number | null): DivergenceResult {
  return {
    current: currentDivergence,
    isWithinLimit: (allowedDivergence: number) => {
      if (currentDivergence === null) return false;
      const currentLevel = DIVERGENCE_LEVELS[divergenceValueToLevel(currentDivergence)];
      const allowedLevel = DIVERGENCE_LEVELS[divergenceValueToLevel(allowedDivergence)];
      return currentDivergence <= allowedDivergence || currentLevel.index === allowedLevel.index;
    },
  };
}

/**
 * Hook to calculate divergence for number attributes
 */
export function useNumberDivergence(
  groups: Distribution['groups'],
  elements: Element[],
  attributeId: string
): DivergenceResult {
  return useMemo(() => {
    const groupAverages: number[] = [];

    groups.forEach((group) => {
      const values: number[] = [];
      group.members.forEach((memberId) => {
        const element = elements.find((e) => e.id === memberId);
        if (element && typeof element.attributes[attributeId] === 'number') {
          values.push(element.attributes[attributeId] as number);
        }
      });

      if (values.length > 0) {
        const average = values.reduce((a, b) => a + b, 0) / values.length;
        groupAverages.push(average);
      }
    });

    if (groupAverages.length === 0) {
      return createDivergenceResult(null);
    }

    const mean = groupAverages.reduce((a, b) => a + b, 0) / groupAverages.length;
    if (mean === 0) {
      return createDivergenceResult(null);
    }

    const maxDeviation = Math.max(...groupAverages.map((avg) => Math.abs(avg - mean)));
    const currentDivergence = maxDeviation / mean;

    return createDivergenceResult(currentDivergence);
  }, [groups, elements, attributeId]);
}

/**
 * Hook to calculate divergence for enum attributes
 */
export function useEnumDivergence(
  groups: Distribution['groups'],
  elements: Element[],
  attributeId: string
): DivergenceResult {
  return useMemo(() => {
    // Build value distribution map: groupId -> value -> count
    const valueDistribution = new Map<string, Map<string, number>>();

    groups.forEach((group) => {
      const valueCounts = new Map<string, number>();
      group.members.forEach((memberId) => {
        const element = elements.find((e) => e.id === memberId);
        if (element && element.attributes[attributeId]) {
          const value = String(element.attributes[attributeId]);
          valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
        }
      });
      valueDistribution.set(group.id, valueCounts);
    });

    // Collect all unique values
    const allValues = new Set<string>();
    valueDistribution.forEach((valueCounts) => {
      valueCounts.forEach((_, value) => allValues.add(value));
    });

    if (allValues.size === 0) {
      return createDivergenceResult(null);
    }

    // Calculate maximum divergence across all values
    let maxDivergence = 0;
    allValues.forEach((value) => {
      const counts = Array.from(valueDistribution.values()).map(
        (valueCounts) => valueCounts.get(value) || 0
      );
      const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
      if (mean > 0) {
        const maxDeviation = Math.max(...counts.map((c) => Math.abs(c - mean)));
        const divergence = maxDeviation / mean;
        maxDivergence = Math.max(maxDivergence, divergence);
      }
    });

    return createDivergenceResult(maxDivergence);
  }, [groups, elements, attributeId]);
}

/**
 * Hook to calculate divergence for the default constraint (group sizes)
 */
export function useGroupSizeDivergence(groups: Distribution['groups']): DivergenceResult {
  return useMemo(() => {
    const groupSizes = groups.map((g) => g.members.length);
    const totalElements = groupSizes.reduce((sum, size) => sum + size, 0);
    const idealSize = totalElements / groups.length;

    if (idealSize === 0) {
      return createDivergenceResult(null);
    }

    const maxDeviation = Math.max(...groupSizes.map((size) => Math.abs(size - idealSize)));
    const currentDivergence = maxDeviation / idealSize;

    return createDivergenceResult(currentDivergence);
  }, [groups]);
}
