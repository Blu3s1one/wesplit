import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ==================== Divergence Level Mapping ====================

export type DivergenceLevel = 'very-strict' | 'strict' | 'mid' | 'loose' | 'very-loose';

export const DIVERGENCE_LEVELS = {
  'very-strict': { value: 0.1, label: 'Very Strict', description: '±10%', index: 0 },
  strict: { value: 0.25, label: 'Strict', description: '±25%', index: 1 },
  mid: { value: 0.5, label: 'Mid', description: '±50%', index: 2 },
  loose: { value: 0.75, label: 'Loose', description: '±75%', index: 3 },
  'very-loose': { value: 0.9, label: 'Very Loose', description: '±90%', index: 4 },
} as const;

export const DIVERGENCE_LEVEL_ORDER: DivergenceLevel[] = [
  'very-strict',
  'strict',
  'mid',
  'loose',
  'very-loose',
];

/**
 * Convert a slider index (0-4) to a divergence level
 */
export function sliderIndexToLevel(index: number): DivergenceLevel {
  return DIVERGENCE_LEVEL_ORDER[Math.max(0, Math.min(4, Math.round(index)))];
}

/**
 * Convert a divergence level to a slider index (0-4)
 */
export function levelToSliderIndex(level: DivergenceLevel): number {
  return DIVERGENCE_LEVELS[level].index;
}

/**
 * Convert a divergence value (0-1) to the nearest level
 */
export function divergenceValueToLevel(value: number): DivergenceLevel {
  const levels = DIVERGENCE_LEVEL_ORDER;
  let closestLevel = levels[0];
  let minDiff = Math.abs(DIVERGENCE_LEVELS[levels[0]].value - value);

  for (const level of levels) {
    const diff = Math.abs(DIVERGENCE_LEVELS[level].value - value);
    if (diff < minDiff) {
      minDiff = diff;
      closestLevel = level;
    }
  }

  return closestLevel;
}

/**
 * Convert a divergence level to its numeric value
 */
export function divergenceLevelToValue(level: DivergenceLevel): number {
  return DIVERGENCE_LEVELS[level].value;
}
