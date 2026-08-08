/**
 * Dynamic Drag & Drop Activity Spec Generator — PetalPath Engine Utility
 * Generates v2.1.0 specification compliant Drag & Drop activities for letters, words, and shapes.
 */

export function generateDynamicDragDropSpec(nodeId: string, title: string): any {
  const cleanTitle = title || '';

  // 1. Check for single letter (e.g. "Letter A", "Letter B", "pn_letter_c")
  const letterMatch = cleanTitle.match(/letter\s+([a-z])/i) || nodeId.match(/letter_([a-z])/i);

  // 2. Check for word (e.g. "Word: Cat", "-at family", "Word Building")
  const wordMatch = cleanTitle.match(/word:\s*([a-z]+)/i) || cleanTitle.match(/-([a-z]+)\s+family/i);

  // ---------------------------------------------------------------------------
  // Case A: Word Building (Dragging letters into outline to make words)
  // ---------------------------------------------------------------------------
  if (wordMatch) {
    const rawWord = wordMatch[1].toUpperCase();
    const letters = rawWord.split('');

    const draggables = letters.map((char, i) => ({
      id: `drag-letter-${i + 1}`,
      contentType: 'text',
      content: char,
      contentLocalizationKey: null,
      assetRef: null,
      position: {
        x: 120 + i * 160,
        y: 550,
        randomizePosition: true,
        sourceRegion: { x: 50, y: 500, width: 900, height: 200 },
      },
      dimensions: { width: 130, height: 130 },
      style: {
        backgroundColor: '#4A90E2',
        borderRadius: 16,
        textColor: '#FFFFFF',
        fontSize: 40,
        fontWeight: 'bold',
      },
      behavior: { draggable: true, returnToOriginOnFailure: true, lockAfterCorrectDrop: true },
      accessibility: { screenReaderLabel: `Letter ${char}` },
      sortOrder: i + 1,
    }));

    // Add 2 distractor letters
    const distractors = ['X', 'Z', 'M', 'P', 'K', 'R'].filter((l) => !letters.includes(l)).slice(0, 2);
    distractors.forEach((dis, idx) => {
      draggables.push({
        id: `drag-distractor-${idx + 1}`,
        contentType: 'text',
        content: dis,
        contentLocalizationKey: null,
        assetRef: null,
        position: {
          x: 120 + (letters.length + idx) * 160,
          y: 550,
          randomizePosition: true,
          sourceRegion: { x: 50, y: 500, width: 900, height: 200 },
        },
        dimensions: { width: 130, height: 130 },
        style: {
          backgroundColor: '#4A90E2',
          borderRadius: 16,
          textColor: '#FFFFFF',
          fontSize: 40,
          fontWeight: 'bold',
        },
        behavior: { draggable: true, returnToOriginOnFailure: true, lockAfterCorrectDrop: true },
        accessibility: { screenReaderLabel: `Letter ${dis}` },
        sortOrder: letters.length + idx + 1,
      });
    });

    const dropZones = letters.map((char, i) => ({
      id: `zone-target-${i + 1}`,
      shape: {
        type: 'rectangle',
        position: { x: 180 + i * 160, y: 220 },
        dimensions: { width: 140, height: 140 },
      },
      acceptedDraggableIds: [`drag-letter-${i + 1}`],
      capacity: 1,
      visualState: {
        defaultAppearance: 'visible',
        hoverHighlight: 'glow',
        correctHighlight: 'glow-green',
        labelText: char,
        targetContent: char,
      },
      snapping: { enabled: true },
      sortOrder: i + 1,
      accessibility: { screenReaderLabel: `Outline slot ${i + 1} for ${char}` },
    }));

    return createSpecObject(nodeId, title, 'missing-word', draggables, dropZones, 'ordered-sequence');
  }

  // ---------------------------------------------------------------------------
  // Case B: Single Letter to Outline (e.g. Letter A, Letter B, Letter C)
  // ---------------------------------------------------------------------------
  let targetLetter = 'A';
  if (letterMatch) {
    targetLetter = letterMatch[1].toUpperCase();
  } else if (nodeId.includes('_')) {
    const parts = nodeId.split('_');
    const lastPart = parts[parts.length - 1];
    if (lastPart.length === 1 && /[a-z]/i.test(lastPart)) {
      targetLetter = lastPart.toUpperCase();
    }
  }

  const otherLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'M', 'S', 'T'].filter(
    (l) => l !== targetLetter
  );
  const selectedDistractors = otherLetters.slice(0, 3);

  const draggables = [
    {
      id: 'drag-item-1',
      contentType: 'text',
      content: targetLetter,
      contentLocalizationKey: null,
      assetRef: null,
      position: {
        x: 100,
        y: 550,
        randomizePosition: true,
        sourceRegion: { x: 50, y: 500, width: 900, height: 200 },
      },
      dimensions: { width: 140, height: 140 },
      style: {
        backgroundColor: '#4A90E2',
        borderRadius: 24,
        textColor: '#FFFFFF',
        fontSize: 64,
        fontWeight: '800',
      },
      behavior: { draggable: true, returnToOriginOnFailure: true, lockAfterCorrectDrop: true },
      accessibility: { screenReaderLabel: `Letter ${targetLetter}` },
      sortOrder: 1,
    },
    ...selectedDistractors.map((dis, idx) => ({
      id: `drag-item-${idx + 2}`,
      contentType: 'text',
      content: dis,
      contentLocalizationKey: null,
      assetRef: null,
      position: {
        x: 100 + (idx + 1) * 200,
        y: 550,
        randomizePosition: true,
        sourceRegion: { x: 50, y: 500, width: 900, height: 200 },
      },
      dimensions: { width: 140, height: 140 },
      style: {
        backgroundColor: '#8B5CF6',
        borderRadius: 24,
        textColor: '#FFFFFF',
        fontSize: 64,
        fontWeight: '800',
      },
      behavior: { draggable: true, returnToOriginOnFailure: true, lockAfterCorrectDrop: true },
      accessibility: { screenReaderLabel: `Letter ${dis}` },
      sortOrder: idx + 2,
    })),
  ];

  const dropZones = [
    {
      id: 'zone-target-1',
      shape: {
        type: 'rectangle',
        position: { x: 420, y: 190 },
        dimensions: { width: 160, height: 160 },
      },
      acceptedDraggableIds: ['drag-item-1'],
      capacity: 1,
      visualState: {
        defaultAppearance: 'visible',
        hoverHighlight: 'glow',
        correctHighlight: 'glow-green',
        labelText: targetLetter,
        targetContent: targetLetter,
      },
      snapping: { enabled: true },
      sortOrder: 1,
      accessibility: { screenReaderLabel: `Outline for ${targetLetter}` },
    },
  ];

  return createSpecObject(nodeId, title, 'letter-to-outline', draggables, dropZones, 'one-to-one');
}

function createSpecObject(
  nodeId: string,
  title: string,
  templateId: string,
  draggables: any[],
  dropZones: any[],
  strategy: string
): any {
  return {
    $schema: 'https://petalpath.io/schemas/drag-drop-activity/v2.1.0',
    id: `petalpath:activity:generated:${nodeId}`,
    schemaVersion: '2.1.0',
    engine: {
      engineId: 'petalpath:engine:drag-drop',
      targetEngineVersion: '1.4.0',
      minimumEngineVersion: '1.0.0',
      requiredCapabilities: ['drag-and-drop', 'snap-to-target'],
    },
    curriculumRef: {
      nodeId,
      activityIndex: 3,
      activityType: 'drag_drop',
    },
    metadata: {
      title: `${title}: Drag & Drop Practice`,
      description: `Drag and drop letters to form ${title}`,
      templateRef: { templateId, templateVersion: '1.0.0' },
      primaryLanguage: 'en-IN',
      supportedLanguages: ['en-IN'],
      tags: [templateId, 'drag-and-drop'],
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    canvas: { width: 1000, height: 750, orientation: 'landscape' },
    draggables,
    dropZones,
    validation: {
      strategy,
      evaluationTiming: 'on-drop',
      allowRetries: true,
      maxAttempts: 0,
      scoringModel: {
        type: 'per-item',
        basePointsPerItem: 10,
        maxScore: 100,
        starThresholds: { oneStar: 0.4, twoStars: 0.7, threeStars: 0.9 },
      },
    },
    interaction: {
      snapping: { preset: 'easy', snapRadius: 100, magneticAttraction: 0.7 },
      dragBehavior: { touchMode: 'offset', dragFeedback: 'both', dragScaleFactor: 1.1 },
      inputModes: { touch: true, mouse: true, keyboard: true },
    },
    animations: {
      onActivityStart: { itemRevealStyle: 'cascade', revealDelayMs: 200 },
      onCorrectDrop: { effects: [{ type: 'sparkle', durationMs: 800 }] },
      onIncorrectDrop: { effects: [{ type: 'gentle-return', durationMs: 500 }] },
      onActivityComplete: { effects: [{ type: 'confetti', durationMs: 2000 }] },
    },
    hints: {
      enabled: true,
      progressiveHints: [
        { level: 1, triggerAfterAttempts: 2, hintType: 'highlight-target', durationMs: 3000 },
      ],
      idleHint: { enabled: true, idleTimeoutMs: 8000, hintType: 'pulse-draggable' },
    },
    accessibility: {
      screenReader: { enabled: true, activityInstructionKey: `Instruction for ${title}` },
      narration: { enabled: true, autoPlayOnLoad: true },
    },
    localization: {
      keyNamespace: `l10n:${nodeId}`,
      fallbackLanguage: 'en-IN',
      stringKeys: {},
      textDirection: 'ltr',
    },
    assets: { required: [], optional: [], preloadStrategy: 'immediate' },
    completionSignals: {
      signals: [
        { signalId: 'activity.completed', condition: 'always', description: 'Emitted on completion' },
        { signalId: 'activity.threeStars', condition: 'score-gte:starThresholds.threeStars', description: 'Three stars' },
      ],
    },
  };
}
