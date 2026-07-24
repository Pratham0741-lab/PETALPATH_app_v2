import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface ActivityCapabilities {
  requiresPose: boolean;
  requiresVoice: boolean;
  requiresCalibration: boolean;
  supportsAdaptiveDifficulty: boolean;
}

interface RawGeneratedActivity {
  schemaVersion: number;
  activityVersion: number;
  id: string;
  title: string;
  description: string;
  validatorName: string;
  category: 'body_movements' | 'hand_activities' | 'facial_expressions' | 'simple_movement' | 'pretend_play' | 'follow_the_leader';
  ageGroup: string;
  repetitions: number;
  holdDuration: number;
  timeout: number;
  difficulty: 'easy' | 'normal' | 'advanced';
  instruction: string;
  feedback: {
    success: string;
    encouragement: string;
    retry: string;
  };
  accessibility: {
    slowCountdown: boolean;
    highContrast: boolean;
  };
  reward: {
    stars: number;
    xp: number;
  };
  capabilities: ActivityCapabilities;
  isAvailable: boolean;
  relatedActivityIds: string[];
  metadata: {
    originalSection: string;
    canonicalIndex: number;
  };
}

const REGISTERED_VALIDATORS = new Set([
  'areHandsAboveShoulders',
  'isHandNearHead',
  'isHandNearKnees',
  'areHandsNearHips',
  'areHandsTouching',
  'isArmCrossedAcrossTorso',
  'isHandMovingHorizontally',
  'isBodyMovingVertically',
]);

const VALID_CATEGORIES = new Set([
  'body_movements',
  'hand_activities',
  'facial_expressions',
  'simple_movement',
  'pretend_play',
  'follow_the_leader',
]);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function mapValidatorName(title: string): string {
  const lower = title.toLowerCase();

  if (lower.includes('head')) return 'isHandNearHead';
  if (lower.includes('knee')) return 'isHandNearKnees';
  if (lower.includes('hip')) return 'areHandsNearHips';
  if (lower.includes('hug')) return 'isArmCrossedAcrossTorso';
  if (lower.includes('wave')) return 'isHandMovingHorizontally';
  if (lower.includes('clap')) return 'areHandsTouching';
  if (lower.includes('jump') || lower.includes('hop')) return 'isBodyMovingVertically';

  return 'areHandsAboveShoulders';
}

function parseLogFile(logContent: string): RawGeneratedActivity[] {
  const lines = logContent.split(/\r?\n/);
  const activities: RawGeneratedActivity[] = [];
  const seenIds = new Set<string>();

  let currentCategoryKey: RawGeneratedActivity['category'] = 'body_movements';
  let currentSectionName = 'BODY MOVEMENTS';
  let globalIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('BODY MOVEMENTS')) {
      currentCategoryKey = 'body_movements';
      currentSectionName = 'BODY MOVEMENTS';
      continue;
    }
    if (line.startsWith('HAND ACTIVITIES')) {
      currentCategoryKey = 'hand_activities';
      currentSectionName = 'HAND ACTIVITIES';
      continue;
    }
    if (line.startsWith('FACIAL EXPRESSIONS')) {
      currentCategoryKey = 'facial_expressions';
      currentSectionName = 'FACIAL EXPRESSIONS';
      continue;
    }
    if (line.startsWith('SIMPLE MOVEMENT')) {
      currentCategoryKey = 'simple_movement';
      currentSectionName = 'SIMPLE MOVEMENT';
      continue;
    }
    if (line.startsWith('PRETEND PLAY')) {
      currentCategoryKey = 'pretend_play';
      currentSectionName = 'PRETEND PLAY';
      continue;
    }
    if (line.startsWith('FOLLOW THE LEADER')) {
      currentCategoryKey = 'follow_the_leader';
      currentSectionName = 'FOLLOW THE LEADER';
      continue;
    }

    if (
      line.startsWith('[') ||
      line.startsWith('Project:') ||
      line.startsWith('Vision') ||
      line.startsWith('Architecture') ||
      line.startsWith('Recommended') ||
      line.startsWith('Design Principles') ||
      line.startsWith('TOTAL ACTIVITIES') ||
      line.startsWith('Future Roadmap') ||
      line.startsWith('-') ||
      line.startsWith('97') ||
      line.length === 0
    ) {
      continue;
    }

    globalIndex += 1;
    let id = slugify(line);

    // If duplicate ID exists across sections, append section suffix
    if (seenIds.has(id)) {
      const sectionSuffix = slugify(currentCategoryKey);
      id = `${id}_${sectionSuffix}`;
    }

    if (seenIds.has(id)) {
      throw new Error(`[Catalog Generator Error] Unresolvable Duplicate Activity ID: '${id}'`);
    }
    seenIds.add(id);

    // Build Validation Check 2: Invalid Category
    if (!VALID_CATEGORIES.has(currentCategoryKey)) {
      throw new Error(`[Catalog Generator Error] Invalid Category detected: '${currentCategoryKey}'`);
    }

    const validatorName = mapValidatorName(line);

    // Build Validation Check 3: Registered Validator
    if (!REGISTERED_VALIDATORS.has(validatorName)) {
      throw new Error(`[Catalog Generator Error] Unregistered Validator detected: '${validatorName}'`);
    }

    activities.push({
      schemaVersion: 1,
      activityVersion: 1,
      id,
      title: line,
      description: `Interactive child activity: ${line}`,
      validatorName,
      category: currentCategoryKey,
      ageGroup: '3-8',
      repetitions: line.toLowerCase().includes('three') ? 3 : line.toLowerCase().includes('five') ? 5 : 1,
      holdDuration: 1500,
      timeout: 30000,
      difficulty: 'normal',
      instruction: `${line}! Follow the mascot guide.`,
      feedback: {
        success: 'Awesome job!',
        encouragement: 'Keep holding steady!',
        retry: 'Adjust your position and try again!',
      },
      accessibility: {
        slowCountdown: false,
        highContrast: false,
      },
      reward: {
        stars: 3,
        xp: 50,
      },
      capabilities: {
        requiresPose: true,
        requiresVoice: false,
        requiresCalibration: true,
        supportsAdaptiveDifficulty: true,
      },
      isAvailable: true,
      relatedActivityIds: [],
      metadata: {
        originalSection: currentSectionName,
        canonicalIndex: globalIndex,
      },
    });
  }

  // Precalculate related activity IDs by category
  activities.forEach((act) => {
    act.relatedActivityIds = activities
      .filter((other) => other.category === act.category && other.id !== act.id)
      .slice(0, 3)
      .map((other) => other.id);
  });

  return activities;
}

function main() {
  const rootLogPath = path.resolve(__dirname, '../PetalPath_Camera_Activities_MVP_Plan.log');
  const targetJsonPath = path.resolve(
    __dirname,
    '../frontend/src/features/camera/catalog/activities.generated.json',
  );

  console.log(`[Catalog Generator] Reading log file from: ${rootLogPath}`);
  const logContent = fs.readFileSync(rootLogPath, 'utf-8');
  const parsedActivities = parseLogFile(logContent);

  const usedValidators = new Set(parsedActivities.map((a) => a.validatorName));
  const unusedValidators = Array.from(REGISTERED_VALIDATORS).filter((v) => !usedValidators.has(v));

  const jsonString = JSON.stringify(parsedActivities, null, 2);
  const checksum = crypto.createHash('sha256').update(jsonString).digest('hex');

  const catalogPayload = {
    _notice: 'AUTO-GENERATED FILE. DO NOT EDIT. Generated by scripts/generateCatalog.ts',
    schemaVersion: 1,
    catalogVersion: 1,
    generatedAt: new Date().toISOString(),
    checksum,
    stats: {
      totalActivities: parsedActivities.length,
      categoriesCount: 6,
      validatorsUsedCount: usedValidators.size,
      unusedValidatorsCount: unusedValidators.length,
    },
    activities: parsedActivities,
  };

  fs.mkdirSync(path.dirname(targetJsonPath), { recursive: true });
  fs.writeFileSync(targetJsonPath, JSON.stringify(catalogPayload, null, 2), 'utf-8');

  console.log(`[Catalog Generator] Success! Generated ${parsedActivities.length} activities.`);
  console.log(
    `[Catalog Generator] Stats: ${parsedActivities.length} Activities | 6 Categories | ${usedValidators.size} Validators Used | ${unusedValidators.length} Unused | Checksum: ${checksum.substring(0, 8)}...`,
  );
}

main();
