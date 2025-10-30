/**
 * Simple pluralization helper
 * Adds 's' to the end of the word, with basic rules for common cases
 */
export function pluralize(word: string, count?: number): string {
  // If count is provided and is 1, return singular
  if (count === 1) {
    return word;
  }

  const lowerWord = word.toLowerCase();

  // Words ending in 'y' preceded by a consonant -> change 'y' to 'ies'
  if (
    lowerWord.endsWith('y') &&
    lowerWord.length > 1 &&
    !/[aeiou]/.test(lowerWord[lowerWord.length - 2])
  ) {
    return word.slice(0, -1) + 'ies';
  }

  // Words ending in 's', 'ss', 'sh', 'ch', 'x', 'z' -> add 'es'
  if (
    lowerWord.endsWith('s') ||
    lowerWord.endsWith('ss') ||
    lowerWord.endsWith('sh') ||
    lowerWord.endsWith('ch') ||
    lowerWord.endsWith('x') ||
    lowerWord.endsWith('z')
  ) {
    return word + 'es';
  }

  // Default: just add 's'
  return word + 's';
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}
