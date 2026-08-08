export interface MatchData {
  guideName: string;
  targetPhrase: string;
  correctAnswer: string;
}

/**
 * Utility to extract matching targets (guideName, targetPhrase, correctAnswer)
 * from the lesson title and activity title to ensure they match the pedagogical context.
 */
export function getLessonMatchData(lessonTitle: string | null | undefined, activityTitle: string | null | undefined): MatchData {
  const lTitle = lessonTitle || '';
  const aTitle = activityTitle || '';
  const combined = `${lTitle} ${aTitle}`.toLowerCase();

  // 1. Specific pre-writing and geometry shapes
  const shapes = [
    'standing line',
    'sleeping line',
    'left slanting line',
    'right slanting line',
    'slanting line',
    'big curve',
    'small curve',
    'semi circle',
    'reverse semi circle',
    'zig-zag',
    'zigzag',
    'spiral',
    'loop',
    'combined curves',
    'left curve',
    'right curve',
    'wave pattern',
    'triangle',
    'square',
    'rectangle',
    'oval',
    'star',
    'heart',
    'diamond',
    'pentagon',
    'hexagon',
    'circle',
  ];

  for (const shape of shapes) {
    if (combined.includes(shape)) {
      const normalized = shape
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      const guide = normalized === 'Zigzag' ? 'Zig-zag' : normalized;
      return {
        guideName: guide,
        targetPhrase: guide,
        correctAnswer: guide,
      };
    }
  }

  // 2. Specific letters (e.g. "Letter A", "Letter b", "sound A")
  const letterMatch = combined.match(/letter\s+([a-z])/i) || combined.match(/sound\s+([a-z])/i);
  if (letterMatch) {
    const letter = letterMatch[1].toUpperCase();
    return {
      guideName: `Letter ${letter}`,
      targetPhrase: `Letter ${letter}`,
      correctAnswer: `Letter ${letter}`,
    };
  }

  // 3. Vowel families (e.g. "-at family", "-ill family")
  const familyMatch = combined.match(/-([a-z]+)\s+family/i);
  if (familyMatch) {
    const family = familyMatch[1].toLowerCase();
    const vowel = family[0].toUpperCase();
    return {
      guideName: `Letter ${vowel}`,
      targetPhrase: family,
      correctAnswer: family,
    };
  }

  // 4. Specific vocabulary words (e.g. "Word: ha", "Aeroplane", "Orange")
  const wordMatch = combined.match(/word:\s*([a-z]+)/i);
  if (wordMatch) {
    const word = wordMatch[1];
    return {
      guideName: `Word ${word}`,
      targetPhrase: word,
      correctAnswer: word,
    };
  }

  // 5. Specific numbers (e.g. "Number 1", "Numbers 1-50")
  // For multi-digit numbers, use the last digit for the tracing guide
  const numberMatch = combined.match(/number\s+(\d+)/i);
  if (numberMatch) {
    const num = numberMatch[1];
    const lastDigit = num.slice(-1);
    return {
      guideName: `Number ${lastDigit}`,
      targetPhrase: `Number ${num}`,
      correctAnswer: `Number ${num}`,
    };
  }

  // 6. Generic Vowels
  if (combined.includes('short a')) {
    return { guideName: 'Letter A', targetPhrase: 'Short A', correctAnswer: 'Short A' };
  }
  if (combined.includes('short e')) {
    return { guideName: 'Letter E', targetPhrase: 'Short E', correctAnswer: 'Short E' };
  }
  if (combined.includes('short i')) {
    return { guideName: 'Letter I', targetPhrase: 'Short I', correctAnswer: 'Short I' };
  }
  if (combined.includes('short o')) {
    return { guideName: 'Letter O', targetPhrase: 'Short O', correctAnswer: 'Short O' };
  }
  if (combined.includes('short u')) {
    return { guideName: 'Letter U', targetPhrase: 'Short U', correctAnswer: 'Short U' };
  }

  // 7. Broad Alphabet / revision sets
  if (combined.includes('capital a-z')) {
    return { guideName: 'Letter A', targetPhrase: 'Alphabet', correctAnswer: 'Alphabet' };
  }
  if (combined.includes('lowercase a-z')) {
    return { guideName: 'Letter A', targetPhrase: 'alphabet', correctAnswer: 'alphabet' };
  }

  // 8. "Lines and Curves", "Trace Lines", "Trace Shapes" → Standing Line default
  if (combined.includes('lines') || combined.includes('curves') || combined.includes('trace line')) {
    return { guideName: 'Standing Line', targetPhrase: 'Standing Line', correctAnswer: 'Standing Line' };
  }

  // 9. "Straight & Slanting" → Standing Line
  if (combined.includes('straight') || (combined.includes('slanting') && !combined.includes('left') && !combined.includes('right'))) {
    return { guideName: 'Standing Line', targetPhrase: 'Standing Line', correctAnswer: 'Standing Line' };
  }

  // 10. "Count-and-Write" → Number 1 default
  if (combined.includes('count') && combined.includes('write')) {
    return { guideName: 'Number 1', targetPhrase: 'Number 1', correctAnswer: 'Number 1' };
  }

  // Fallbacks: dynamically derive from lesson title
  const fallbackTitle = lTitle.trim() || 'Practice';
  return {
    guideName: fallbackTitle,
    targetPhrase: fallbackTitle,
    correctAnswer: fallbackTitle,
  };
}
