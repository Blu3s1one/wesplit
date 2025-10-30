import type { Element, Attribute, Constraint, Group } from '../db/schemas';
import { DIVERGENCE_LEVELS, divergenceValueToLevel } from './utils';

/**
 * Custom error for distribution generation failures
 */
export class DistributionGenerationError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean = true
  ) {
    super(message);
    this.name = 'DistributionGenerationError';
  }
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate groups with random distribution
 */
export function generateRandomDistribution(elements: Element[], groupCount: number): Group[] {
  if (elements.length === 0 || groupCount <= 0) {
    return [];
  }

  // Initialize empty groups
  const groups: Group[] = Array.from({ length: groupCount }, (_, i) => ({
    id: crypto.randomUUID(),
    name: `Group ${i + 1}`,
    members: [],
  }));

  // Shuffle elements for random distribution
  const shuffled = shuffleArray(elements);

  // Distribute elements evenly across groups
  shuffled.forEach((element, index) => {
    const groupIndex = index % groupCount;
    groups[groupIndex].members.push(element.id);
  });

  return groups;
}

/**
 * Calculate enum attribute distribution across groups
 */
function calculateEnumDistribution(
  groups: Group[],
  elements: Element[],
  attributeId: string
): Map<string, Map<string, number>> {
  const distribution = new Map<string, Map<string, number>>();

  groups.forEach((group) => {
    const valueCounts = new Map<string, number>();
    group.members.forEach((memberId) => {
      const element = elements.find((e) => e.id === memberId);
      if (element && element.attributes[attributeId]) {
        const value = element.attributes[attributeId] as string;
        valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
      }
    });
    distribution.set(group.id, valueCounts);
  });

  return distribution;
}

/**
 * Calculate numeric attribute averages across groups
 */
function calculateNumericAverages(
  groups: Group[],
  elements: Element[],
  attributeId: string
): Map<string, number> {
  const averages = new Map<string, number>();

  groups.forEach((group) => {
    const values: number[] = [];
    group.members.forEach((memberId) => {
      const element = elements.find((e) => e.id === memberId);
      if (element && typeof element.attributes[attributeId] === 'number') {
        values.push(element.attributes[attributeId] as number);
      }
    });

    const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    averages.set(group.id, average);
  });

  return averages;
}

/**
 * Calculate global penalty score for non-mandatory constraints (lower is better)
 * According to generation.mdc specifications
 */
export function calculateGlobalPenalty(
  groups: Group[],
  elements: Element[],
  constraints: Constraint[],
  attributes: Attribute[]
): number {
  let globalPenalty = 0;

  // Only consider non-mandatory constraints
  const nonMandatoryConstraints = constraints.filter((c) => {
    // Number and default constraints don't have mandatory property (always non-mandatory)
    if (c.type === 'number' || c.type === 'default') return true;
    // Other types have mandatory property
    return !c.mandatory;
  });

  nonMandatoryConstraints.forEach((constraint) => {
    // Default constraint doesn't have attributeId
    const attribute =
      constraint.type !== 'default'
        ? attributes.find((a) => a.id === constraint.attributeId)
        : null;
    if (!attribute && constraint.type !== 'default') return;

    let attributePenalty = 0;
    const importance =
      'allowedDivergence' in constraint && constraint.allowedDivergence !== undefined
        ? 1 - constraint.allowedDivergence
        : 0.8; // Default importance

    if (constraint.type === 'enum') {
      if (constraint.mode === 'balance') {
        // Calculate divergence from target balance
        const distribution = calculateEnumDistribution(groups, elements, constraint.attributeId);
        const allValues = new Set<string>();

        distribution.forEach((valueCounts) => {
          valueCounts.forEach((_, value) => allValues.add(value));
        });

        // Calculate actual vs target divergence
        allValues.forEach((value) => {
          const counts = Array.from(distribution.values()).map(
            (valueCounts) => valueCounts.get(value) || 0
          );
          const mean = counts.reduce((a, b) => a + b, 0) / counts.length;

          if (mean > 0) {
            const maxDeviation = Math.max(...counts.map((c) => Math.abs(c - mean)));
            const actualDivergence = maxDeviation / mean;
            const targetDivergence = constraint.allowedDivergence ?? 0.2;

            // Penalty is difference between actual and target (normalized 0-1)
            attributePenalty += Math.max(0, actualDivergence - targetDivergence);
          }
        });
      } else if (constraint.mode === 'exclude') {
        // Count intruders: elements in groups with multiple values
        let intruderCount = 0;
        let totalWithAttribute = 0;

        groups.forEach((group) => {
          const values = new Set<string>();
          const membersWithValue: string[] = [];

          group.members.forEach((memberId) => {
            const element = elements.find((e) => e.id === memberId);
            if (element && element.attributes[constraint.attributeId]) {
              values.add(element.attributes[constraint.attributeId] as string);
              membersWithValue.push(memberId);
            }
          });

          totalWithAttribute += membersWithValue.length;

          // If more than one value, all minority members are intruders
          if (values.size > 1) {
            const valueCounts = new Map<string, number>();
            membersWithValue.forEach((memberId) => {
              const element = elements.find((e) => e.id === memberId);
              const value = element?.attributes[constraint.attributeId] as string;
              valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
            });

            const maxCount = Math.max(...Array.from(valueCounts.values()));
            const minorityCount = membersWithValue.length - maxCount;
            intruderCount += minorityCount;
          }
        });

        // Normalize by total elements with this attribute
        attributePenalty = totalWithAttribute > 0 ? intruderCount / totalWithAttribute : 0;
      }
    } else if (constraint.type === 'number' && constraint.balanceAverage) {
      // Calculate divergence from target balance
      const averages = calculateNumericAverages(groups, elements, constraint.attributeId);
      const avgArray = Array.from(averages.values());

      if (avgArray.length > 0) {
        const mean = avgArray.reduce((a, b) => a + b, 0) / avgArray.length;

        if (mean > 0) {
          const maxDeviation = Math.max(...avgArray.map((a) => Math.abs(a - mean)));
          const actualDivergence = maxDeviation / mean;
          const targetDivergence = constraint.allowedDivergence ?? 0.2;

          // Penalty is difference between actual and target (normalized 0-1)
          attributePenalty = Math.max(0, actualDivergence - targetDivergence);
        }
      }
    } else if (constraint.type === 'attractive') {
      // Count intruders: elements that are split from their group
      let intruderCount = 0;
      const valueToGroups = new Map<string, Set<string>>();

      groups.forEach((group) => {
        group.members.forEach((memberId) => {
          const element = elements.find((e) => e.id === memberId);
          const attrValue = element?.attributes[constraint.attributeId];

          if (element && attrValue !== undefined && attrValue !== null && attrValue !== '') {
            const value = String(attrValue);
            if (!valueToGroups.has(value)) {
              valueToGroups.set(value, new Set());
            }
            valueToGroups.get(value)?.add(group.id);
          }
        });
      });

      // For each value in multiple groups, count elements in minority groups as intruders
      valueToGroups.forEach((groupSet, value) => {
        if (groupSet.size > 1) {
          // Count elements per group for this value
          const groupCounts = new Map<string, number>();
          groups.forEach((group) => {
            const count = group.members.filter((memberId) => {
              const element = elements.find((e) => e.id === memberId);
              return element && String(element.attributes[constraint.attributeId]) === value;
            }).length;
            if (count > 0) {
              groupCounts.set(group.id, count);
            }
          });

          const maxCount = Math.max(...Array.from(groupCounts.values()));
          const totalCount = Array.from(groupCounts.values()).reduce((a, b) => a + b, 0);
          intruderCount += totalCount - maxCount;
        }
      });

      // Get total elements with this attribute
      const totalWithAttribute = elements.filter(
        (e) =>
          e.attributes[constraint.attributeId] !== undefined &&
          e.attributes[constraint.attributeId] !== null &&
          e.attributes[constraint.attributeId] !== ''
      ).length;

      attributePenalty = totalWithAttribute > 0 ? intruderCount / totalWithAttribute : 0;
    } else if (constraint.type === 'repulsive') {
      // Count intruders: duplicate values in same group
      let intruderCount = 0;

      groups.forEach((group) => {
        const valueCounts = new Map<string, number>();

        group.members.forEach((memberId) => {
          const element = elements.find((e) => e.id === memberId);
          const attrValue = element?.attributes[constraint.attributeId];

          if (element && attrValue !== undefined && attrValue !== null && attrValue !== '') {
            const value = String(attrValue);
            valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
          }
        });

        // For each value that appears multiple times, all but one are intruders
        valueCounts.forEach((count) => {
          if (count > 1) {
            intruderCount += count - 1;
          }
        });
      });

      // Get total elements with this attribute
      const totalWithAttribute = elements.filter(
        (e) =>
          e.attributes[constraint.attributeId] !== undefined &&
          e.attributes[constraint.attributeId] !== null &&
          e.attributes[constraint.attributeId] !== ''
      ).length;

      attributePenalty = totalWithAttribute > 0 ? intruderCount / totalWithAttribute : 0;
    } else if (constraint.type === 'default' && constraint.balanceGroupSizes) {
      // Calculate penalty for unbalanced group sizes
      const groupSizes = groups.map((g) => g.members.length);
      const totalElements = groupSizes.reduce((sum, size) => sum + size, 0);

      if (totalElements > 0) {
        const idealSize = totalElements / groups.length;
        const targetDivergence = constraint.allowedDivergence ?? 0.2;

        // Calculate actual divergence: max deviation from ideal as a proportion
        const maxDeviation = Math.max(...groupSizes.map((size) => Math.abs(size - idealSize)));
        const actualDivergence = idealSize > 0 ? maxDeviation / idealSize : 0;

        // Penalty is difference between actual and target (normalized 0-1)
        attributePenalty = Math.max(0, actualDivergence - targetDivergence);
      }
    }

    // Add weighted penalty to global score
    globalPenalty += attributePenalty * importance;
  });

  return globalPenalty;
}

/**
 * Validate if mandatory constraints are compatible with the number of groups
 * Returns an error message if incompatible, null if compatible
 */
export function validateMandatoryConstraints(
  elements: Element[],
  groupCount: number,
  constraints: Constraint[],
  attributes: Attribute[]
): string | null {
  const mandatoryConstraints = constraints.filter(
    (c) =>
      (c.type === 'enum' && c.mandatory && c.mode === 'exclude') ||
      (c.type === 'attractive' && c.mandatory) ||
      (c.type === 'repulsive' && c.mandatory)
  );

  if (mandatoryConstraints.length === 0) {
    return null; // No mandatory constraints, always compatible
  }

  for (const constraint of mandatoryConstraints) {
    // Default constraint is never mandatory, so we can safely access attributeId
    if (constraint.type === 'default') continue;

    const attribute = attributes.find((a) => a.id === constraint.attributeId);
    if (!attribute) continue;

    if (constraint.type === 'enum' && constraint.mode === 'exclude') {
      // For exclude mode: count unique values - need at least that many groups
      // Each unique value must be in a separate group
      const uniqueValues = new Set<string>();
      elements.forEach((element) => {
        if (element.attributes[constraint.attributeId] !== undefined) {
          uniqueValues.add(String(element.attributes[constraint.attributeId]));
        }
      });

      if (uniqueValues.size > groupCount) {
        return `Mandatory constraint "${attribute.name}" (exclude mode) requires at least ${uniqueValues.size} groups (${uniqueValues.size} unique values need to be in separate groups), but only ${groupCount} groups requested.`;
      }
    } else if (constraint.type === 'repulsive') {
      // For repulsive: count max occurrences of any value - need at least that many groups
      const valueCounts = new Map<string, number>();
      elements.forEach((element) => {
        if (element.attributes[constraint.attributeId] !== undefined) {
          const value = String(element.attributes[constraint.attributeId]);
          valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
        }
      });

      const maxOccurrences = Math.max(...Array.from(valueCounts.values()), 0);
      if (maxOccurrences > groupCount) {
        const problematicValue = Array.from(valueCounts.entries()).find(
          ([, count]) => count === maxOccurrences
        )?.[0];
        return `Mandatory constraint "${attribute.name}" cannot be satisfied: value "${problematicValue}" appears ${maxOccurrences} times but only ${groupCount} groups requested (same values must be in different groups).`;
      }
    }
  }

  // Check for conflicts between constraints
  // Build sets of element pairs that must be together and must be apart
  const mustBeTogether = new Set<string>(); // Set of "elementId1:elementId2" pairs
  const mustBeApart = new Set<string>(); // Set of "elementId1:elementId2" pairs

  for (const constraint of mandatoryConstraints) {
    // Default constraint is never mandatory, so we can safely access attributeId
    if (constraint.type === 'default') continue;

    const attribute = attributes.find((a) => a.id === constraint.attributeId);
    if (!attribute) continue;

    if (constraint.type === 'attractive') {
      // Group elements by value - elements with same value must be together
      const valueToElements = new Map<string, string[]>();
      elements.forEach((element) => {
        if (element.attributes[constraint.attributeId] !== undefined) {
          const value = String(element.attributes[constraint.attributeId]);
          if (!valueToElements.has(value)) {
            valueToElements.set(value, []);
          }
          valueToElements.get(value)?.push(element.id);
        }
      });

      // Add all pairs within each value group to mustBeTogether
      valueToElements.forEach((elementIds) => {
        for (let i = 0; i < elementIds.length; i++) {
          for (let j = i + 1; j < elementIds.length; j++) {
            const pair = [elementIds[i], elementIds[j]].sort().join(':');
            mustBeTogether.add(pair);
          }
        }
      });
    } else if (
      constraint.type === 'repulsive' ||
      (constraint.type === 'enum' && constraint.mode === 'exclude')
    ) {
      // Elements with same value must be apart
      const valueToElements = new Map<string, string[]>();
      elements.forEach((element) => {
        if (element.attributes[constraint.attributeId] !== undefined) {
          const value = String(element.attributes[constraint.attributeId]);
          if (!valueToElements.has(value)) {
            valueToElements.set(value, []);
          }
          valueToElements.get(value)?.push(element.id);
        }
      });

      // Add all pairs within each value group to mustBeApart
      valueToElements.forEach((elementIds) => {
        for (let i = 0; i < elementIds.length; i++) {
          for (let j = i + 1; j < elementIds.length; j++) {
            const pair = [elementIds[i], elementIds[j]].sort().join(':');
            mustBeApart.add(pair);
          }
        }
      });
    }
  }

  // Check for conflicts: any pair that must be both together AND apart
  for (const pair of mustBeTogether) {
    if (mustBeApart.has(pair)) {
      const [id1, id2] = pair.split(':');
      const el1 = elements.find((e) => e.id === id1);
      const el2 = elements.find((e) => e.id === id2);
      return `Conflicting mandatory constraints: elements "${el1?.name}" and "${el2?.name}" must be together (attractive constraint) AND must be apart (repulsive/exclude constraint). This is impossible to satisfy.`;
    }
  }

  return null; // All mandatory constraints are compatible
}

/**
 * Check if placing an element in a group would violate mandatory constraints
 * Uses the existing checkConstraintSatisfaction function for consistency
 */
function wouldViolateMandatoryConstraintsOnPlacement(
  elementId: string,
  groupIndex: number,
  groups: Group[],
  elements: Element[],
  mandatoryConstraints: Constraint[],
  attributes: Attribute[]
): boolean {
  // Create hypothetical groups with the element placed in the target group
  const hypotheticalGroups = groups.map((g, idx) => ({
    ...g,
    members: idx === groupIndex ? [...g.members, elementId] : [...g.members],
  }));

  // Check if any mandatory constraints would be violated
  const { satisfied } = checkConstraintSatisfaction(
    hypotheticalGroups,
    elements,
    mandatoryConstraints,
    attributes
  );

  return !satisfied; // Return true if constraints are NOT satisfied (i.e., violated)
}

/**
 * Generate initial distribution with mandatory constraints (Phase 0.1)
 * According to generation.mdc specifications
 */
export function generateInitialWithMandatoryConstraints(
  elements: Element[],
  constraints: Constraint[],
  attributes: Attribute[],
  numGroups: number,
  maxAttempts: number = 100
): { groups: Group[]; remainingElements: Element[] } {
  // Filter mandatory constraints (number and default constraints don't have mandatory property)
  const mandatoryConstraints = constraints.filter(
    (c) => c.type !== 'number' && c.type !== 'default' && c.mandatory
  );

  // If no mandatory constraints, return empty groups and all elements
  if (mandatoryConstraints.length === 0) {
    const groups: Group[] = Array.from({ length: numGroups }, (_, i) => ({
      id: crypto.randomUUID(),
      name: `Group ${i + 1}`,
      members: [],
    }));
    return { groups, remainingElements: elements };
  }

  // Step 1: Split elements into mandatory and non-mandatory
  const mandatoryElements = elements.filter((element) =>
    mandatoryConstraints.some((c) => {
      // Default constraint has no attributeId
      if (c.type === 'default') return false;
      return element.attributes[c.attributeId] !== undefined;
    })
  );

  const nonMandatoryElements = elements.filter(
    (element) =>
      !mandatoryConstraints.some((c) => {
        // Default constraint has no attributeId
        if (c.type === 'default') return false;
        return element.attributes[c.attributeId] !== undefined;
      })
  );

  // Step 2: Verify mandatory constraints are compatible
  const validationError = validateMandatoryConstraints(
    elements,
    numGroups,
    constraints,
    attributes
  );
  if (validationError) {
    throw new DistributionGenerationError(validationError, false);
  }

  // Step 3: Try to place mandatory elements with retries
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Initialize empty groups
    const groups: Group[] = Array.from({ length: numGroups }, (_, i) => ({
      id: crypto.randomUUID(),
      name: `Group ${i + 1}`,
      members: [],
    }));

    // Shuffle elements for random placement
    const shuffledElements = shuffleArray(mandatoryElements);
    let allPlaced = true;

    // Try to place each element
    for (const element of shuffledElements) {
      let placed = false;

      // Try each group in random order
      const groupIndices = shuffleArray(Array.from({ length: numGroups }, (_, i) => i));

      for (const gi of groupIndices) {
        // Check if placing element would violate mandatory constraints
        if (
          !wouldViolateMandatoryConstraintsOnPlacement(
            element.id,
            gi,
            groups,
            elements,
            mandatoryConstraints,
            attributes
          )
        ) {
          groups[gi].members.push(element.id);
          placed = true;
          break;
        }
      }

      if (!placed) {
        allPlaced = false;
        break; // Failed this attempt, try again
      }
    }

    if (allPlaced) {
      // Success!
      return { groups, remainingElements: nonMandatoryElements };
    }
  }

  // Step 4: If maxAttempts reached, throw error
  throw new DistributionGenerationError(
    `Unable to create distribution with mandatory constraints after ${maxAttempts} attempts. ` +
      'The constraints may be too complex or conflicting.',
    true
  );
}

/**
 * Fill groups with non-mandatory elements to minimize global penalty (Phase 0.2)
 * According to generation.mdc specifications
 */
export function generateInitialWithoutMandatoryConstraints(
  nonMandatoryElements: Element[],
  allElements: Element[],
  constraints: Constraint[],
  attributes: Attribute[],
  groups: Group[]
): Group[] {
  // Make a copy of groups to avoid mutating the input
  const updatedGroups = groups.map((g) => ({ ...g, members: [...g.members] }));

  // Shuffle non-mandatory elements for fairness
  const shuffledElements = shuffleArray(nonMandatoryElements);

  // For each non-mandatory element, place it in the group that yields lowest penalty
  for (const element of shuffledElements) {
    let bestGroupIndex = 0;
    let bestPenalty = Infinity;

    // Try adding element to each group and calculate resulting penalty
    for (let gi = 0; gi < updatedGroups.length; gi++) {
      // Create hypothetical groups with element in this group
      const hypotheticalGroups = updatedGroups.map((g, idx) => ({
        ...g,
        members: idx === gi ? [...g.members, element.id] : [...g.members],
      }));

      // Calculate global penalty
      const penalty = calculateGlobalPenalty(
        hypotheticalGroups,
        allElements,
        constraints,
        attributes
      );

      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        bestGroupIndex = gi;
      }
    }

    // Place element in the best group
    updatedGroups[bestGroupIndex].members.push(element.id);
  }

  return updatedGroups;
}

/**
 * Optimize distribution by swapping elements to reduce global penalty (Phase 1)
 * According to generation.mdc specifications
 */
export function performSwaps(
  groups: Group[],
  allElements: Element[],
  constraints: Constraint[],
  attributes: Attribute[],
  numSwaps: number
): Group[] {
  // Make a copy of groups to avoid mutating the input
  let currentGroups = groups.map((g) => ({ ...g, members: [...g.members] }));
  let currentPenalty = calculateGlobalPenalty(currentGroups, allElements, constraints, attributes);

  // Get mandatory constraints to avoid swapping elements that have them
  const mandatoryConstraints = constraints.filter(
    (c) => c.type !== 'number' && c.type !== 'default' && c.mandatory
  );

  // Get elements without mandatory constraints (eligible for swapping)
  const swappableElements = allElements.filter(
    (element) =>
      !mandatoryConstraints.some((c) => {
        // Default constraint has no attributeId
        if (c.type === 'default') return false;
        return element.attributes[c.attributeId] !== undefined;
      })
  );

  // Get IDs of swappable elements for faster lookup
  const swappableIds = new Set(swappableElements.map((e) => e.id));

  // Perform swaps
  for (let swapAttempt = 0; swapAttempt < numSwaps; swapAttempt++) {
    // Collect all swappable element positions
    const swappablePositions: Array<{
      groupIndex: number;
      memberIndex: number;
      elementId: string;
    }> = [];

    currentGroups.forEach((group, groupIndex) => {
      group.members.forEach((memberId, memberIndex) => {
        if (swappableIds.has(memberId)) {
          swappablePositions.push({ groupIndex, memberIndex, elementId: memberId });
        }
      });
    });

    // Need at least 2 swappable elements
    if (swappablePositions.length < 2) {
      break;
    }

    // Randomly select two different elements to swap
    const pos1Index = Math.floor(Math.random() * swappablePositions.length);
    let pos2Index = Math.floor(Math.random() * swappablePositions.length);

    // Ensure they're different
    while (pos2Index === pos1Index && swappablePositions.length > 1) {
      pos2Index = Math.floor(Math.random() * swappablePositions.length);
    }

    const pos1 = swappablePositions[pos1Index];
    const pos2 = swappablePositions[pos2Index];

    // Skip if they're in the same group
    if (pos1.groupIndex === pos2.groupIndex) {
      continue;
    }

    // Create new groups with the swap
    const newGroups = currentGroups.map((g) => ({ ...g, members: [...g.members] }));
    newGroups[pos1.groupIndex].members[pos1.memberIndex] = pos2.elementId;
    newGroups[pos2.groupIndex].members[pos2.memberIndex] = pos1.elementId;

    // Check if swap would violate mandatory constraints
    if (mandatoryConstraints.length > 0) {
      const { satisfied } = checkConstraintSatisfaction(
        newGroups,
        allElements,
        mandatoryConstraints,
        attributes
      );

      if (!satisfied) {
        continue; // Skip this swap
      }
    }

    // Calculate new penalty
    const newPenalty = calculateGlobalPenalty(newGroups, allElements, constraints, attributes);

    // Keep swap only if it improves (reduces) the penalty
    if (newPenalty < currentPenalty) {
      currentGroups = newGroups;
      currentPenalty = newPenalty;
    }
  }

  return currentGroups;
}

/**
 * Generate groups with constraint-based distribution using the new algorithm
 * According to generation.mdc specifications
 */
export function generateConstraintBasedDistribution(
  elements: Element[],
  groupCount: number,
  constraints: Constraint[],
  attributes: Attribute[]
): Group[] {
  if (elements.length === 0 || groupCount <= 0) {
    return [];
  }

  // Phase 0.1: Generate initial distribution with mandatory constraints
  const { groups, remainingElements } = generateInitialWithMandatoryConstraints(
    elements,
    constraints,
    attributes,
    groupCount,
    100 // maxAttempts
  );

  // Phase 0.2: Complete distribution with non-mandatory elements
  const filledGroups = generateInitialWithoutMandatoryConstraints(
    remainingElements,
    elements,
    constraints,
    attributes,
    groups
  );

  // Phase 1: Perform swaps to minimize global penalty
  const numSwaps = Math.min(1000, elements.length * 10);
  const optimizedGroups = performSwaps(filledGroups, elements, constraints, attributes, numSwaps);

  return optimizedGroups;
}

/**
 * Calculate statistics for a group
 */
export interface GroupStats {
  groupId: string;
  memberCount: number;
  enumStats: Map<string, Map<string, number>>; // attributeId -> value -> count
  numberStats: Map<string, { average: number; min: number; max: number }>; // attributeId -> stats
}

export function calculateGroupStats(
  group: Group,
  elements: Element[],
  attributes: Attribute[]
): GroupStats {
  const stats: GroupStats = {
    groupId: group.id,
    memberCount: group.members.length,
    enumStats: new Map(),
    numberStats: new Map(),
  };

  // Calculate enum stats (including attractive and repulsive)
  attributes
    .filter((a) => a.type === 'enum' || a.type === 'attractive' || a.type === 'repulsive')
    .forEach((attr) => {
      const valueCounts = new Map<string, number>();
      group.members.forEach((memberId) => {
        const element = elements.find((e) => e.id === memberId);
        if (element && element.attributes[attr.id]) {
          const value = element.attributes[attr.id] as string;
          valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
        }
      });
      stats.enumStats.set(attr.id, valueCounts);
    });

  // Calculate number stats
  attributes
    .filter((a) => a.type === 'number')
    .forEach((attr) => {
      const values: number[] = [];
      group.members.forEach((memberId) => {
        const element = elements.find((e) => e.id === memberId);
        if (element && typeof element.attributes[attr.id] === 'number') {
          values.push(element.attributes[attr.id] as number);
        }
      });

      if (values.length > 0) {
        const average = values.reduce((a, b) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        stats.numberStats.set(attr.id, { average, min, max });
      }
    });

  return stats;
}

/**
 * Check if constraints are satisfied across all groups
 */
export function checkConstraintSatisfaction(
  groups: Group[],
  elements: Element[],
  constraints: Constraint[],
  attributes: Attribute[]
): { satisfied: boolean; issues: string[] } {
  const issues: string[] = [];

  constraints.forEach((constraint) => {
    if (constraint.type === 'enum') {
      const attribute = attributes.find((a) => a.id === constraint.attributeId);
      if (!attribute) return;
      if (constraint.mode === 'balance') {
        const distribution = calculateEnumDistribution(groups, elements, constraint.attributeId);
        const allValues = new Set<string>();
        distribution.forEach((valueCounts) => {
          valueCounts.forEach((_, value) => allValues.add(value));
        });

        // Use constraint's allowedDivergence instead of global tolerance
        const constraintTolerance = constraint.allowedDivergence ?? 0.2;
        // Add epsilon to account for values that round to the same divergence level
        // This allows any value that displays as the same level to pass validation
        // Epsilon = half the distance to the next level (covers the rounding boundary)
        const epsilon = 0.125; // Covers values up to the midpoint between levels

        allValues.forEach((value) => {
          const counts = Array.from(distribution.values()).map(
            (valueCounts) => valueCounts.get(value) || 0
          );
          const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
          const maxDeviation = Math.max(...counts.map((c) => Math.abs(c - mean)));

          if (mean > 0 && maxDeviation / mean > constraintTolerance + epsilon) {
            issues.push(
              `${attribute.name}: value "${value}" is not evenly distributed across groups`
            );
          }
        });
      } else if (constraint.mode === 'exclude') {
        // Check that each group has only one unique value for this attribute
        groups.forEach((group, idx) => {
          const values = new Set<string>();
          group.members.forEach((memberId) => {
            const element = elements.find((e) => e.id === memberId);
            if (element && element.attributes[constraint.attributeId]) {
              values.add(element.attributes[constraint.attributeId] as string);
            }
          });
          if (values.size > 1) {
            issues.push(
              `${attribute.name}: Group ${idx + 1} contains multiple different values (${Array.from(values).join(', ')})`
            );
          }
        });
      }
    } else if (constraint.type === 'number' && constraint.balanceAverage) {
      const attribute = attributes.find((a) => a.id === constraint.attributeId);
      if (!attribute) return;

      const averages = calculateNumericAverages(groups, elements, constraint.attributeId);
      const avgArray = Array.from(averages.values());
      const mean = avgArray.reduce((a, b) => a + b, 0) / avgArray.length;
      const maxDeviation = Math.max(...avgArray.map((a) => Math.abs(a - mean)));

      // Use constraint's allowedDivergence
      const allowedDivergence = constraint.allowedDivergence ?? 0.2;
      // Add epsilon to account for values that round to the same divergence level
      const epsilon = 0.125; // Covers values up to the midpoint between levels

      if (mean > 0 && maxDeviation / mean > allowedDivergence + epsilon) {
        issues.push(`${attribute.name}: averages are not balanced across groups`);
      }
    } else if (constraint.type === 'attractive') {
      const attribute = attributes.find((a) => a.id === constraint.attributeId);
      if (!attribute) return;
      // Check that same values are grouped together (each value in only one group)
      const valueToGroups = new Map<string, Set<string>>();

      groups.forEach((group) => {
        group.members.forEach((memberId) => {
          const element = elements.find((e) => e.id === memberId);
          const attrValue = element?.attributes[constraint.attributeId];
          // Only count elements that have a defined, non-null, non-empty value
          if (element && attrValue !== undefined && attrValue !== null && attrValue !== '') {
            const value = String(attrValue);
            if (!valueToGroups.has(value)) {
              valueToGroups.set(value, new Set());
            }
            const groupSet = valueToGroups.get(value);
            if (groupSet) {
              groupSet.add(group.id);
            }
          }
        });
      });

      // Report values that are spread across multiple groups
      valueToGroups.forEach((groupSet, value) => {
        if (groupSet.size > 1) {
          issues.push(
            `${attribute.name}: value "${value}" is spread across ${groupSet.size} groups (should be together)`
          );
        }
      });
    } else if (constraint.type === 'repulsive') {
      const attribute = attributes.find((a) => a.id === constraint.attributeId);
      if (!attribute) return;

      // Check that same values are NOT in the same group
      groups.forEach((group, idx) => {
        const valueCounts = new Map<string, number>();

        group.members.forEach((memberId) => {
          const element = elements.find((e) => e.id === memberId);
          const attrValue = element?.attributes[constraint.attributeId];
          // Only count elements that have a defined, non-null, non-empty value
          if (element && !!attrValue) {
            const value = String(attrValue);
            valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
          }
        });

        // Report values that appear multiple times in the same group
        valueCounts.forEach((count, value) => {
          if (count > 1) {
            issues.push(
              `${attribute.name}: value "${value}" appears ${count} times in Group ${idx + 1} (should be separated)`
            );
          }
        });
      });
    } else if (constraint.type === 'default' && constraint.balanceGroupSizes) {
      // Check that group sizes are balanced
      const groupSizes = groups.map((g) => g.members.length);
      const totalElements = groupSizes.reduce((sum, size) => sum + size, 0);

      if (totalElements > 0) {
        const idealSize = totalElements / groups.length;
        const allowedDivergence = constraint.allowedDivergence ?? 0.2;
        const allowedDivergenceLevel = DIVERGENCE_LEVELS[divergenceValueToLevel(allowedDivergence)];
        const maxDeviation = Math.max(...groupSizes.map((size) => Math.abs(size - idealSize)));
        const actualDivergence = idealSize > 0 ? maxDeviation / idealSize : 0;
        const actualDivergenceLevel = DIVERGENCE_LEVELS[divergenceValueToLevel(actualDivergence)];

        if (
          idealSize > 0 &&
          actualDivergence > allowedDivergence &&
          actualDivergenceLevel.index !== allowedDivergenceLevel.index
        ) {
          const minSize = Math.min(...groupSizes);
          const maxSize = Math.max(...groupSizes);
          issues.push(
            `Group sizes are not balanced (range: ${minSize}-${maxSize}, ideal: ${Math.round(idealSize)})`
          );
        }
      }
    }
  });

  return {
    satisfied: issues.length === 0,
    issues,
  };
}
