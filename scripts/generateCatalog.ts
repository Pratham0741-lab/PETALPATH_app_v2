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

/**
 * Must mirror the keys registered in
 * `frontend/src/features/camera/catalog/ValidatorRegistry.ts`. The generator
 * throws on any validator missing from this set, and
 * `scripts/verifyPosePrimitives.ts` asserts the two lists match, so a primitive
 * added on one side cannot quietly drift from the other.
 */
const REGISTERED_VALIDATORS = new Set([
  // Static — hands relative to the body
  'areHandsAboveShoulders',
  'areBothHandsAboveShoulders',
  'isLeftHandRaised',
  'isRightHandRaised',
  'areHandsBelowHips',
  'areArmsExtendedSideways',
  'isHandNearHead',
  'areHandsNearFace',
  'areHandsNearShoulders',
  'isHandNearTorso',
  'isHandNearKnees',
  'areHandsNearAnkles',
  'areHandsNearHips',
  'areHandsTouching',
  'isArmCrossedAcrossTorso',
  'areHandsForward',
  'areHandsBehindBack',
  // Static — whole-body posture
  'isSquatting',
  'isStandingUpright',
  'isStarPose',
  // Temporal
  'isHandMovingHorizontally',
  'isBodyMovingVertically',
  'isMarchingInPlace',
  'isBodyRotating',
  'isSteppingSideways',
  'isHeadNoddingVertically',
  'isHeadShakingHorizontally',
  'isBodyStill',
  'isBodyWiggling',
  // Participation
  'isChildParticipating',
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

/**
 * Activities that MoveNet cannot verify, routed to the participation check.
 *
 * MoveNet SinglePose gives 17 body keypoints — nose, eyes, ears, shoulders,
 * elbows, wrists, hips, knees, ankles. There are no mouth landmarks and no
 * finger landmarks, so smiling, blinking, winking, puffed cheeks, thumbs-up and
 * pinched fingers are not observable at all. They previously fell through to
 * `areHandsAboveShoulders`, which told a child who was smiling perfectly to
 * raise their hands.
 *
 * `isChildParticipating` validates what genuinely can be seen — the child is
 * present, facing the camera, upper body in frame and settled — and the activity
 * runs as guided imitation. Verifying these properly needs a face-mesh and a
 * hand-landmark model alongside MoveNet.
 */
const PARTICIPATION_ONLY_TITLES = new Set([
  'thumbs up',
  'open hands',
  'close hands',
  'show both palms',
  'tiny hands (pinch)',
  'smile',
  'big smile',
  'laugh',
  'surprise face',
  'sleepy face',
  'silly face',
  'puff cheeks',
  'blink',
  'wink',
  'open mouth',
]);

/**
 * Explicit title-to-primitive map for every activity in the plan.
 *
 * This replaces a seven-rule keyword cascade whose final `return
 * 'areHandsAboveShoulders'` swallowed 78 of the 99 entries — including "Hands
 * down", "Sit down", "Touch toes" and "Freeze like a statue", all of which were
 * then validated by checking whether the child had raised their hands. That
 * single line is why detection felt wrong on almost every activity.
 *
 * Keys are lowercased titles. Anything not listed falls through to
 * `inferValidatorName`, and the generator reports every such title so new
 * entries get classified deliberately rather than defaulting into a pose that
 * has nothing to do with them.
 */
const VALIDATOR_BY_TITLE: Record<string, string> = {
  // --- BODY MOVEMENTS ---
  'raise both hands': 'areBothHandsAboveShoulders',
  'raise left hand': 'isLeftHandRaised',
  'raise right hand': 'isRightHandRaised',
  'stretch up high': 'areBothHandsAboveShoulders',
  'stretch arms wide': 'areArmsExtendedSideways',
  'touch head': 'isHandNearHead',
  'touch shoulders': 'areHandsNearShoulders',
  'touch tummy': 'isHandNearTorso',
  'touch knees': 'isHandNearKnees',
  'touch toes': 'areHandsNearAnkles',
  'hands on hips': 'areHandsNearHips',
  'stand like a star': 'isStarPose',
  'sit down': 'isSquatting',
  'stand up': 'isStandingUpright',
  'give yourself a hug': 'isArmCrossedAcrossTorso',

  // --- HAND ACTIVITIES ---
  'wave hello': 'isHandMovingHorizontally',
  'wave goodbye': 'isHandMovingHorizontally',
  'clap once': 'areHandsTouching',
  'clap three times': 'areHandsTouching',
  'clap five times': 'areHandsTouching',
  'reach hands forward': 'areHandsForward',
  'reach hands sideways': 'areArmsExtendedSideways',
  'hands behind back': 'areHandsBehindBack',
  'hands on cheeks': 'areHandsNearFace',
  'hands over head': 'areBothHandsAboveShoulders',

  // --- FACIAL EXPRESSIONS (only head motion is observable) ---
  'nod yes': 'isHeadNoddingVertically',
  'shake head no': 'isHeadShakingHorizontally',

  // --- SIMPLE MOVEMENT ---
  'jump once': 'isBodyMovingVertically',
  'jump three times': 'isBodyMovingVertically',
  'hop in place': 'isBodyMovingVertically',
  'march in place': 'isMarchingInPlace',
  'walk in place': 'isMarchingInPlace',
  'spin once': 'isBodyRotating',
  'spin slowly': 'isBodyRotating',
  'step left': 'isSteppingSideways',
  'step right': 'isSteppingSideways',
  'reach for the sky': 'areBothHandsAboveShoulders',
  'pretend to fly': 'areArmsExtendedSideways',
  'wiggle body': 'isBodyWiggling',
  'shake hands': 'isBodyWiggling',
  'freeze like a statue': 'isBodyStill',
  'stretch and relax': 'areBothHandsAboveShoulders',

  // --- PRETEND PLAY (mapped to the gross body shape each mime produces) ---
  bird: 'areArmsExtendedSideways',
  butterfly: 'areArmsExtendedSideways',
  rabbit: 'isBodyMovingVertically',
  frog: 'isSquatting',
  cat: 'isSquatting',
  dog: 'isSquatting',
  elephant: 'areHandsForward',
  monkey: 'isBodyWiggling',
  swim: 'areHandsForward',
  'row a boat': 'areHandsForward',
  'drive a car': 'areHandsForward',
  'fly an airplane': 'areArmsExtendedSideways',
  'water a plant': 'areHandsForward',
  'brush your teeth': 'areHandsNearFace',
  'wash your hands': 'areHandsTouching',
  'comb your hair': 'isHandNearHead',
  'wave to a friend': 'isHandMovingHorizontally',
  'catch a butterfly': 'areHandsAboveShoulders',
  'reach for a balloon': 'areHandsAboveShoulders',
  'pick a flower': 'isSquatting',

  // --- FOLLOW THE LEADER ---
  'raise hands': 'areHandsAboveShoulders',
  wave: 'isHandMovingHorizontally',
  clap: 'areHandsTouching',
  jump: 'isBodyMovingVertically',
  march: 'isMarchingInPlace',
  freeze: 'isBodyStill',
  'hug yourself': 'isArmCrossedAcrossTorso',
  stretch: 'areBothHandsAboveShoulders',
  'hands up': 'areBothHandsAboveShoulders',
  'hands down': 'areHandsBelowHips',
  'turn left': 'isBodyRotating',
  'turn right': 'isBodyRotating',
  'reach forward': 'areHandsForward',
  'reach up': 'areBothHandsAboveShoulders',
  wiggle: 'isBodyWiggling',
  'celebrate ("yay!")': 'areHandsAboveShoulders',
};

/** Titles that fell through to the keyword cascade, reported at the end. */
const unmappedTitles: string[] = [];

/**
 * Keyword fallback for titles absent from `VALIDATOR_BY_TITLE`.
 *
 * Ordered most-specific first, because several keywords co-occur — "hands down"
 * contains both "hands" and "down", and the old cascade's ordering meant "Touch
 * toes" never reached a toe rule at all. Unlike the old version this has no
 * blanket default: an unrecognised title becomes a participation check rather
 * than a confident but wrong pose assertion.
 */
function inferValidatorName(lower: string): string {
  // Negations and directions first — they invert otherwise-matching keywords.
  if (/\b(hands? down|arms? down|put .*down)\b/.test(lower)) return 'areHandsBelowHips';
  if (/\b(behind|back)\b/.test(lower) && lower.includes('hand')) return 'areHandsBehindBack';

  if (/\b(toes?|feet|ankles?)\b/.test(lower)) return 'areHandsNearAnkles';
  if (/\b(knees?)\b/.test(lower)) return 'isHandNearKnees';
  if (/\b(hips?|waist)\b/.test(lower)) return 'areHandsNearHips';
  if (/\b(tummy|belly|stomach|chest)\b/.test(lower)) return 'isHandNearTorso';
  if (/\b(shoulders?)\b/.test(lower)) return 'areHandsNearShoulders';
  if (/\b(cheeks?|face|nose|ears?)\b/.test(lower)) return 'areHandsNearFace';
  if (/\b(head|hair)\b/.test(lower)) return 'isHandNearHead';

  if (/\b(hug|cuddle|squeeze yourself)\b/.test(lower)) return 'isArmCrossedAcrossTorso';
  if (/\b(clap|wash)\b/.test(lower)) return 'areHandsTouching';
  if (/\b(wave)\b/.test(lower)) return 'isHandMovingHorizontally';
  if (/\b(nod)\b/.test(lower)) return 'isHeadNoddingVertically';
  if (/\b(shake head)\b/.test(lower)) return 'isHeadShakingHorizontally';

  if (/\b(jump|hop|bounce)\b/.test(lower)) return 'isBodyMovingVertically';
  if (/\b(march|walk in place|stomp)\b/.test(lower)) return 'isMarchingInPlace';
  if (/\b(spin|twirl|turn (around|left|right))\b/.test(lower)) return 'isBodyRotating';
  if (/\b(step (left|right|side)|side ?step)\b/.test(lower)) return 'isSteppingSideways';
  if (/\b(freeze|statue|still)\b/.test(lower)) return 'isBodyStill';
  if (/\b(wiggle|shake|dance|celebrate|silly dance)\b/.test(lower)) return 'isBodyWiggling';

  if (/\b(sit|crouch|squat|bend down|kneel)\b/.test(lower)) return 'isSquatting';
  if (/\b(stand (up|tall))\b/.test(lower)) return 'isStandingUpright';
  if (/\b(star)\b/.test(lower)) return 'isStarPose';

  if (/\b(wide|sideways|wings?|fly|airplane|bird|butterfly)\b/.test(lower)) {
    return 'areArmsExtendedSideways';
  }
  if (/\b(forward|in front)\b/.test(lower)) return 'areHandsForward';
  if (/\b(both hands|hands up|reach up|stretch up|sky|high|above)\b/.test(lower)) {
    return 'areBothHandsAboveShoulders';
  }
  if (/\b(raise|lift|reach)\b/.test(lower)) return 'areHandsAboveShoulders';

  // No blanket "assume hands above shoulders". If we cannot tell what the pose
  // is, say so rather than failing the child against an unrelated one.
  unmappedTitles.push(lower);
  return 'isChildParticipating';
}

function mapValidatorName(title: string): string {
  const lower = title.toLowerCase().trim();

  if (PARTICIPATION_ONLY_TITLES.has(lower)) return 'isChildParticipating';

  const explicit = VALIDATOR_BY_TITLE[lower];
  if (explicit) return explicit;

  return inferValidatorName(lower);
}

function parseLogFile(logContent: string): RawGeneratedActivity[] {
  const lines = logContent.split(/\r?\n/);
  const activities: RawGeneratedActivity[] = [];
  const seenIds = new Set<string>();

  let currentCategoryKey: RawGeneratedActivity['category'] = 'body_movements';
  let currentSectionName = 'BODY MOVEMENTS';
  let globalIndex = 0;

  /**
   * Nothing counts as an activity until a section header has been seen.
   *
   * The plan's preamble contains prose lines that the old skip-list did not
   * cover, so "PetalPath - Real-Time Camera Based Activities (MVP)" (under
   * "Project:") and "Lesson" (the first line of the architecture diagram) were
   * both emitted as playable activities. The plan states 97 activities; the
   * catalog held 99. Gating on the section header removes both without needing
   * to enumerate every prose line.
   */
  let inSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('BODY MOVEMENTS')) {
      currentCategoryKey = 'body_movements';
      currentSectionName = 'BODY MOVEMENTS';
      inSection = true;
      continue;
    }
    if (line.startsWith('HAND ACTIVITIES')) {
      currentCategoryKey = 'hand_activities';
      currentSectionName = 'HAND ACTIVITIES';
      inSection = true;
      continue;
    }
    if (line.startsWith('FACIAL EXPRESSIONS')) {
      currentCategoryKey = 'facial_expressions';
      currentSectionName = 'FACIAL EXPRESSIONS';
      inSection = true;
      continue;
    }
    if (line.startsWith('SIMPLE MOVEMENT')) {
      currentCategoryKey = 'simple_movement';
      currentSectionName = 'SIMPLE MOVEMENT';
      inSection = true;
      continue;
    }
    if (line.startsWith('PRETEND PLAY')) {
      currentCategoryKey = 'pretend_play';
      currentSectionName = 'PRETEND PLAY';
      inSection = true;
      continue;
    }
    if (line.startsWith('FOLLOW THE LEADER')) {
      currentCategoryKey = 'follow_the_leader';
      currentSectionName = 'FOLLOW THE LEADER';
      inSection = true;
      continue;
    }

    if (
      !inSection ||
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

    /**
     * Participation-only activities are guided imitation: the camera confirms the
     * child is there and engaged, not that they smiled. Their retry copy must not
     * imply the pose was judged and found wrong, because it was never judged.
     */
    const isParticipationOnly = validatorName === 'isChildParticipating';

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
      instruction: isParticipationOnly
        ? `${line}! Copy the mascot — we'll cheer you on.`
        : `${line}! Follow the mascot guide.`,
      feedback: {
        success: 'Awesome job!',
        encouragement: isParticipationOnly ? "You're doing great — keep going!" : 'Keep holding steady!',
        retry: isParticipationOnly
          ? 'Stay in front of the camera and try along with the mascot!'
          : 'Adjust your position and try again!',
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
        requiresPose: !isParticipationOnly,
        requiresVoice: false,
        requiresCalibration: true,
        supportsAdaptiveDifficulty: !isParticipationOnly,
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

  // Distribution report. The point of the classifier rewrite was to stop one
  // validator absorbing the catalog, so make the shape of the result visible.
  const perValidator = new Map<string, number>();
  parsedActivities.forEach((a) => perValidator.set(a.validatorName, (perValidator.get(a.validatorName) || 0) + 1));
  const distribution = Array.from(perValidator.entries()).sort((a, b) => b[1] - a[1]);

  const participationCount = perValidator.get('isChildParticipating') || 0;

  if (unmappedTitles.length > 0) {
    console.warn(
      `[Catalog Generator] ${unmappedTitles.length} title(s) had no explicit mapping and fell through ` +
        `to the keyword classifier. Add them to VALIDATOR_BY_TITLE so their pose is chosen deliberately:`,
    );
    unmappedTitles.forEach((t) => console.warn(`  - "${t}"`));
  }

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
  console.log('[Catalog Generator] Validator distribution:');
  distribution.forEach(([name, count]) => {
    const tag = name === 'isChildParticipating' ? '  (participation check — pose not verifiable)' : '';
    console.log(`  ${String(count).padStart(3)}  ${name}${tag}`);
  });
  console.log(
    `[Catalog Generator] ${parsedActivities.length - participationCount} activities are pose-validated, ` +
      `${participationCount} are participation checks.`,
  );
}

main();
