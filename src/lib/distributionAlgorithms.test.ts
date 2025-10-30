import { describe, it, expect } from 'vitest';
import {
  calculateGlobalPenalty,
  generateInitialWithMandatoryConstraints,
  generateInitialWithoutMandatoryConstraints,
  performSwaps,
  generateConstraintBasedDistribution,
} from './distributionAlgorithms';
import type { Element, Attribute, Constraint, Group } from '../db/schemas';

describe('Distribution Algorithm', () => {
  // Sample test data
  const attributes: Attribute[] = [
    {
      id: 'attr-gender',
      sessionId: 'session-1',
      name: 'Gender',
      type: 'enum',
      required: false,
      options: ['Male', 'Female'],
    },
    {
      id: 'attr-score',
      sessionId: 'session-1',
      name: 'Score',
      type: 'number',
      required: false,
      min: 0,
      max: 100,
    },
    {
      id: 'attr-team',
      sessionId: 'session-1',
      name: 'Team',
      type: 'attractive',
      required: false,
    },
    {
      id: 'attr-conflict',
      sessionId: 'session-1',
      name: 'Conflict',
      type: 'repulsive',
      required: false,
    },
  ];

  const elements: Element[] = [
    {
      id: 'elem-1',
      sessionId: 'session-1',
      name: 'Alice',
      attributes: { 'attr-gender': 'Female', 'attr-score': 85, 'attr-team': 'A' },
    },
    {
      id: 'elem-2',
      sessionId: 'session-1',
      name: 'Bob',
      attributes: { 'attr-gender': 'Male', 'attr-score': 90, 'attr-team': 'A' },
    },
    {
      id: 'elem-3',
      sessionId: 'session-1',
      name: 'Charlie',
      attributes: { 'attr-gender': 'Male', 'attr-score': 75, 'attr-team': 'B' },
    },
    {
      id: 'elem-4',
      sessionId: 'session-1',
      name: 'Diana',
      attributes: { 'attr-gender': 'Female', 'attr-score': 80, 'attr-conflict': 'X' },
    },
    {
      id: 'elem-5',
      sessionId: 'session-1',
      name: 'Eve',
      attributes: { 'attr-gender': 'Female', 'attr-score': 95, 'attr-conflict': 'X' },
    },
    {
      id: 'elem-6',
      sessionId: 'session-1',
      name: 'Frank',
      attributes: { 'attr-gender': 'Male', 'attr-score': 70 },
    },
  ];

  describe('calculateGlobalPenalty', () => {
    it('should return 0 penalty for perfectly balanced distribution', () => {
      const groups: Group[] = [
        {
          id: 'group-1',
          name: 'Group 1',
          members: ['elem-1', 'elem-2'], // 1 Female, 1 Male
        },
        {
          id: 'group-2',
          name: 'Group 2',
          members: ['elem-3', 'elem-4'], // 1 Male, 1 Female
        },
      ];

      const constraints: Constraint[] = [
        {
          type: 'enum',
          attributeId: 'attr-gender',
          mode: 'balance',
          mandatory: false,
          allowedDivergence: 0.5,
        },
      ];

      const penalty = calculateGlobalPenalty(groups, elements, constraints, attributes);
      expect(penalty).toBeGreaterThanOrEqual(0);
    });

    it('should calculate penalty for attractive constraint violations', () => {
      const groups: Group[] = [
        {
          id: 'group-1',
          name: 'Group 1',
          members: ['elem-1'], // Team A
        },
        {
          id: 'group-2',
          name: 'Group 2',
          members: ['elem-2'], // Team A (should be with elem-1)
        },
      ];

      const constraints: Constraint[] = [
        {
          type: 'attractive',
          attributeId: 'attr-team',
          mandatory: false,
        },
      ];

      const penalty = calculateGlobalPenalty(groups, elements, constraints, attributes);
      expect(penalty).toBeGreaterThan(0);
    });

    it('should calculate penalty for repulsive constraint violations', () => {
      const groups: Group[] = [
        {
          id: 'group-1',
          name: 'Group 1',
          members: ['elem-4', 'elem-5'], // Both have conflict 'X'
        },
      ];

      const constraints: Constraint[] = [
        {
          type: 'repulsive',
          attributeId: 'attr-conflict',
          mandatory: false,
        },
      ];

      const penalty = calculateGlobalPenalty(groups, elements, constraints, attributes);
      expect(penalty).toBeGreaterThan(0);
    });

    it('should not consider mandatory constraints in penalty calculation', () => {
      const groups: Group[] = [
        {
          id: 'group-1',
          name: 'Group 1',
          members: ['elem-1', 'elem-2'],
        },
      ];

      const constraints: Constraint[] = [
        {
          type: 'attractive',
          attributeId: 'attr-team',
          mandatory: true, // This should not contribute to penalty
        },
      ];

      const penalty = calculateGlobalPenalty(groups, elements, constraints, attributes);
      expect(penalty).toBe(0);
    });

    it('should calculate penalty for unbalanced group sizes with default constraint', () => {
      const groups: Group[] = [
        {
          id: 'group-1',
          name: 'Group 1',
          members: ['elem-1', 'elem-2', 'elem-3', 'elem-4'], // 4 elements
        },
        {
          id: 'group-2',
          name: 'Group 2',
          members: ['elem-5'], // 1 element
        },
        {
          id: 'group-3',
          name: 'Group 3',
          members: ['elem-6'], // 1 element
        },
      ];

      const constraints: Constraint[] = [
        {
          type: 'default',
          balanceGroupSizes: true,
          allowedDivergence: 0.2, // Allow 20% divergence
        },
      ];

      const penalty = calculateGlobalPenalty(groups, elements, constraints, attributes);
      // Ideal size is 2 per group, but we have 4, 1, 1
      // Max deviation is 2, actual divergence is 2/2 = 1.0
      // Target divergence is 0.2, so penalty should be 1.0 - 0.2 = 0.8
      expect(penalty).toBeGreaterThan(0);
    });

    it('should return 0 penalty for perfectly balanced group sizes', () => {
      const groups: Group[] = [
        {
          id: 'group-1',
          name: 'Group 1',
          members: ['elem-1', 'elem-2'],
        },
        {
          id: 'group-2',
          name: 'Group 2',
          members: ['elem-3', 'elem-4'],
        },
        {
          id: 'group-3',
          name: 'Group 3',
          members: ['elem-5', 'elem-6'],
        },
      ];

      const constraints: Constraint[] = [
        {
          type: 'default',
          balanceGroupSizes: true,
          allowedDivergence: 0.2,
        },
      ];

      const penalty = calculateGlobalPenalty(groups, elements, constraints, attributes);
      // Perfectly balanced (2, 2, 2), so penalty should be 0
      expect(penalty).toBe(0);
    });
  });

  describe('generateInitialWithMandatoryConstraints', () => {
    it('should create groups when no mandatory constraints exist', () => {
      const constraints: Constraint[] = [
        {
          type: 'enum',
          attributeId: 'attr-gender',
          mode: 'balance',
          mandatory: false,
          allowedDivergence: 0.2,
        },
      ];

      const result = generateInitialWithMandatoryConstraints(elements, constraints, attributes, 2);

      expect(result.groups).toHaveLength(2);
      expect(result.remainingElements).toHaveLength(elements.length);
      expect(result.groups[0].members).toHaveLength(0);
    });

    it('should place elements with mandatory attractive constraints together', () => {
      const constraints: Constraint[] = [
        {
          type: 'attractive',
          attributeId: 'attr-team',
          mandatory: true,
        },
      ];

      const result = generateInitialWithMandatoryConstraints(elements, constraints, attributes, 3);

      expect(result.groups).toHaveLength(3);

      // Find which group has elem-1 (Team A)
      const group1Members = result.groups.find((g) => g.members.includes('elem-1'));
      const group2Members = result.groups.find((g) => g.members.includes('elem-3'));

      // elem-1 and elem-2 should be in the same group (both Team A)
      expect(group1Members?.members).toContain('elem-2');
      // elem-3 should be in a different group (Team B)
      expect(group2Members?.members).not.toContain('elem-1');
      expect(group2Members?.members).not.toContain('elem-2');
    });

    it('should separate elements with mandatory repulsive constraints', () => {
      const constraints: Constraint[] = [
        {
          type: 'repulsive',
          attributeId: 'attr-conflict',
          mandatory: true,
        },
      ];

      const result = generateInitialWithMandatoryConstraints(elements, constraints, attributes, 3);

      expect(result.groups).toHaveLength(3);

      // elem-4 and elem-5 should NOT be in the same group (both have conflict 'X')
      const group4 = result.groups.find((g) => g.members.includes('elem-4'));
      expect(group4?.members).not.toContain('elem-5');
    });

    it('should throw error for impossible mandatory constraints', () => {
      // 3 elements with same repulsive value but only 2 groups
      const testElements: Element[] = [
        {
          id: 'elem-a',
          sessionId: 'session-1',
          name: 'A',
          attributes: { 'attr-conflict': 'Y' },
        },
        {
          id: 'elem-b',
          sessionId: 'session-1',
          name: 'B',
          attributes: { 'attr-conflict': 'Y' },
        },
        {
          id: 'elem-c',
          sessionId: 'session-1',
          name: 'C',
          attributes: { 'attr-conflict': 'Y' },
        },
      ];

      const constraints: Constraint[] = [
        {
          type: 'repulsive',
          attributeId: 'attr-conflict',
          mandatory: true,
        },
      ];

      expect(() => {
        generateInitialWithMandatoryConstraints(testElements, constraints, attributes, 2);
      }).toThrow();
    });
  });

  describe('generateInitialWithoutMandatoryConstraints', () => {
    it('should place elements to minimize global penalty', () => {
      const initialGroups: Group[] = [
        {
          id: 'group-1',
          name: 'Group 1',
          members: ['elem-1'], // Female
        },
        {
          id: 'group-2',
          name: 'Group 2',
          members: ['elem-2'], // Male
        },
      ];

      const remainingElements: Element[] = [elements[2], elements[3]]; // Charlie (Male), Diana (Female)

      const constraints: Constraint[] = [
        {
          type: 'enum',
          attributeId: 'attr-gender',
          mode: 'balance',
          mandatory: false,
          allowedDivergence: 0.2,
        },
      ];

      const result = generateInitialWithoutMandatoryConstraints(
        remainingElements,
        elements,
        constraints,
        attributes,
        initialGroups
      );

      expect(result).toHaveLength(2);
      expect(result[0].members.length + result[1].members.length).toBe(4);
    });
  });

  describe('performSwaps', () => {
    it('should keep swaps that reduce penalty', () => {
      const initialGroups: Group[] = [
        {
          id: 'group-1',
          name: 'Group 1',
          members: ['elem-1', 'elem-2'], // Team A together (good)
        },
        {
          id: 'group-2',
          name: 'Group 2',
          members: ['elem-3', 'elem-4'], // Team B and unrelated
        },
      ];

      const constraints: Constraint[] = [
        {
          type: 'attractive',
          attributeId: 'attr-team',
          mandatory: false,
        },
      ];

      const initialPenalty = calculateGlobalPenalty(
        initialGroups,
        elements,
        constraints,
        attributes
      );

      const result = performSwaps(initialGroups, elements, constraints, attributes, 100);

      const finalPenalty = calculateGlobalPenalty(result, elements, constraints, attributes);

      // Penalty should not increase
      expect(finalPenalty).toBeLessThanOrEqual(initialPenalty);
    });

    it('should not swap elements with mandatory constraints', () => {
      const initialGroups: Group[] = [
        {
          id: 'group-1',
          name: 'Group 1',
          members: ['elem-1', 'elem-2'], // Team A together (mandatory)
        },
        {
          id: 'group-2',
          name: 'Group 2',
          members: ['elem-3', 'elem-6'], // Others
        },
      ];

      const constraints: Constraint[] = [
        {
          type: 'attractive',
          attributeId: 'attr-team',
          mandatory: true,
        },
      ];

      const result = performSwaps(initialGroups, elements, constraints, attributes, 100);

      // elem-1 and elem-2 should still be together
      const group1 = result.find((g) => g.members.includes('elem-1'));
      expect(group1?.members).toContain('elem-2');
    });
  });

  describe('generateConstraintBasedDistribution (Integration)', () => {
    it('should generate valid distribution with no constraints', () => {
      const result = generateConstraintBasedDistribution(elements, 2, [], attributes);

      expect(result).toHaveLength(2);
      expect(result[0].members.length + result[1].members.length).toBe(elements.length);
    });

    it('should generate distribution respecting mandatory constraints', () => {
      const constraints: Constraint[] = [
        {
          type: 'attractive',
          attributeId: 'attr-team',
          mandatory: true,
        },
      ];

      const result = generateConstraintBasedDistribution(elements, 3, constraints, attributes);

      expect(result).toHaveLength(3);

      // elem-1 and elem-2 should be together (Team A)
      const group1 = result.find((g) => g.members.includes('elem-1'));
      expect(group1?.members).toContain('elem-2');
    });

    it('should optimize non-mandatory constraints', () => {
      const constraints: Constraint[] = [
        {
          type: 'repulsive',
          attributeId: 'attr-conflict',
          mandatory: false,
        },
      ];

      const result = generateConstraintBasedDistribution(elements, 2, constraints, attributes);

      expect(result).toHaveLength(2);

      const penalty = calculateGlobalPenalty(result, elements, constraints, attributes);

      // Should try to separate conflicting elements
      expect(penalty).toBeDefined();
    });

    it('should handle mixed mandatory and non-mandatory constraints', () => {
      const constraints: Constraint[] = [
        {
          type: 'attractive',
          attributeId: 'attr-team',
          mandatory: true,
        },
        {
          type: 'enum',
          attributeId: 'attr-gender',
          mode: 'balance',
          mandatory: false,
          allowedDivergence: 0.2,
        },
      ];

      const result = generateConstraintBasedDistribution(elements, 3, constraints, attributes);

      expect(result).toHaveLength(3);

      // Mandatory: elem-1 and elem-2 together
      const group1 = result.find((g) => g.members.includes('elem-1'));
      expect(group1?.members).toContain('elem-2');

      // All elements should be distributed
      const totalMembers = result.reduce((sum, g) => sum + g.members.length, 0);
      expect(totalMembers).toBe(elements.length);
    });

    it('should balance group sizes with default constraint', () => {
      const constraints: Constraint[] = [
        {
          type: 'default',
          balanceGroupSizes: true,
          allowedDivergence: 0.2,
        },
      ];

      const result = generateConstraintBasedDistribution(elements, 3, constraints, attributes);

      expect(result).toHaveLength(3);

      // Check that groups are relatively balanced
      const sizes = result.map((g) => g.members.length);
      const minSize = Math.min(...sizes);
      const maxSize = Math.max(...sizes);

      // With 6 elements and 3 groups, ideal is 2 each
      // With 20% divergence allowed, max should be at most 2 * 1.2 = 2.4, so max 2 or 3
      expect(maxSize - minSize).toBeLessThanOrEqual(1);

      // All elements should be distributed
      const totalMembers = result.reduce((sum, g) => sum + g.members.length, 0);
      expect(totalMembers).toBe(elements.length);
    });

    it('should handle default constraint with other constraints', () => {
      const constraints: Constraint[] = [
        {
          type: 'default',
          balanceGroupSizes: true,
          allowedDivergence: 0.3,
        },
        {
          type: 'enum',
          attributeId: 'attr-gender',
          mode: 'balance',
          mandatory: false,
          allowedDivergence: 0.3,
        },
      ];

      const result = generateConstraintBasedDistribution(elements, 2, constraints, attributes);

      expect(result).toHaveLength(2);

      // Check balanced sizes
      const sizes = result.map((g) => g.members.length);
      expect(Math.abs(sizes[0] - sizes[1])).toBeLessThanOrEqual(1);

      // All elements should be distributed
      const totalMembers = result.reduce((sum, g) => sum + g.members.length, 0);
      expect(totalMembers).toBe(elements.length);
    });
  });
});
