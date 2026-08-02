/**
 * Typed validators for drag_drop activities.
 *
 * No string paths. Each validator is a function that inspects a typed
 * subsection of the activity and returns a ValidationResult.
 */

import type {
  ActivityValidator,
  CurriculumNode,
  ValidationIssue,
  ValidationResult,
} from '../types';
import { mergeResults } from '../types';

// ---------------------------------------------------------------------------
// Type-safe access helpers
// ---------------------------------------------------------------------------

function get(obj: Record<string, unknown>, ...keys: string[]): unknown {
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function issue(
  severity: 'error' | 'warning' | 'info',
  field: string,
  message: string,
): ValidationIssue {
  return { severity, field, message };
}

// ---------------------------------------------------------------------------
// Subsection validators
// ---------------------------------------------------------------------------

function validateRoot(activity: Record<string, unknown>): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (typeof activity.id !== 'string' || !activity.id) {
    issues.push(issue('error', 'id', 'Missing or invalid activity id'));
  } else if (!/^petalpath:activity:[0-9a-f-]+$/.test(activity.id as string)) {
    issues.push(issue('warning', 'id', 'Activity id does not match URN pattern'));
  }

  if (activity.schemaVersion !== '2.1.0') {
    issues.push(issue('error', 'schemaVersion', `Expected "2.1.0", got "${activity.schemaVersion}"`));
  }

  return { valid: issues.every((i) => i.severity !== 'error'), issues };
}

function validateEngine(activity: Record<string, unknown>): ValidationResult {
  const issues: ValidationIssue[] = [];
  const engine = activity.engine as Record<string, unknown> | undefined;

  if (!engine || typeof engine !== 'object') {
    issues.push(issue('error', 'engine', 'Missing engine object'));
    return { valid: false, issues };
  }

  if (typeof engine.engineId !== 'string' || !engine.engineId) {
    issues.push(issue('error', 'engine.engineId', 'Missing or invalid engineId'));
  }

  if (typeof engine.minimumEngineVersion !== 'string' || !engine.minimumEngineVersion) {
    issues.push(issue('error', 'engine.minimumEngineVersion', 'Missing minimumEngineVersion'));
  }

  return { valid: issues.every((i) => i.severity !== 'error'), issues };
}

function validateCurriculumRef(
  activity: Record<string, unknown>,
  curriculumNodes: Map<string, CurriculumNode>,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const ref = activity.curriculumRef as Record<string, unknown> | undefined;

  if (!ref || typeof ref !== 'object') {
    issues.push(issue('error', 'curriculumRef', 'Missing curriculumRef object'));
    return { valid: false, issues };
  }

  if (typeof ref.nodeId !== 'string' || !ref.nodeId) {
    issues.push(issue('error', 'curriculumRef.nodeId', 'Missing nodeId'));
  }

  if (typeof ref.activityIndex !== 'number') {
    issues.push(issue('error', 'curriculumRef.activityIndex', 'Missing activityIndex'));
  }

  if (ref.activityType !== 'drag_drop') {
    issues.push(issue('error', 'curriculumRef.activityType', `Expected "drag_drop", got "${ref.activityType}"`));
  }

  // Cross-reference with curriculum data
  if (typeof ref.nodeId === 'string' && curriculumNodes.size > 0) {
    const node = curriculumNodes.get(ref.nodeId as string);
    if (!node) {
      issues.push(issue('error', 'curriculumRef.nodeId', `Node "${ref.nodeId}" not found in curriculum grade files`));
    } else if (typeof ref.activityIndex === 'number') {
      const idx = ref.activityIndex as number;
      if (!node.activities || idx < 0 || idx >= node.activities.length) {
        issues.push(issue('error', 'curriculumRef.activityIndex', `Activity index ${idx} out of bounds for node "${ref.nodeId}" (has ${node.activities?.length ?? 0} activities)`));
      } else if (node.activities[idx].type !== 'drag_drop') {
        issues.push(issue('error', 'curriculumRef.activityType', `Curriculum entry at index ${idx} has type "${node.activities[idx].type}", expected "drag_drop"`));
      }
    }
  }

  return { valid: issues.every((i) => i.severity !== 'error'), issues };
}

function validateMetadata(activity: Record<string, unknown>): ValidationResult {
  const issues: ValidationIssue[] = [];
  const meta = activity.metadata as Record<string, unknown> | undefined;

  if (!meta || typeof meta !== 'object') {
    issues.push(issue('error', 'metadata', 'Missing metadata object'));
    return { valid: false, issues };
  }

  const requiredStrings: Array<[string, string]> = [
    ['title', 'metadata.title'],
    ['description', 'metadata.description'],
    ['activityType', 'metadata.activityType'],
    ['primaryLanguage', 'metadata.primaryLanguage'],
    ['status', 'metadata.status'],
    ['createdAt', 'metadata.createdAt'],
    ['updatedAt', 'metadata.updatedAt'],
  ];

  for (const [key, path] of requiredStrings) {
    if (typeof meta[key] !== 'string' || !(meta[key] as string)) {
      issues.push(issue('error', path, `Missing required field`));
    }
  }

  // templateRef
  const templateRef = meta.templateRef as Record<string, unknown> | undefined;
  if (!templateRef || typeof templateRef !== 'object') {
    issues.push(issue('error', 'metadata.templateRef', 'Missing templateRef object'));
  } else if (typeof templateRef.templateId !== 'string' || !templateRef.templateId) {
    issues.push(issue('error', 'metadata.templateRef.templateId', 'Missing templateId'));
  }

  return { valid: issues.every((i) => i.severity !== 'error'), issues };
}

function validateCanvas(activity: Record<string, unknown>): ValidationResult {
  const issues: ValidationIssue[] = [];
  const canvas = activity.canvas as Record<string, unknown> | undefined;

  if (!canvas || typeof canvas !== 'object') {
    issues.push(issue('error', 'canvas', 'Missing canvas object'));
    return { valid: false, issues };
  }

  if (typeof canvas.width !== 'number' || canvas.width <= 0) {
    issues.push(issue('error', 'canvas.width', 'Missing or invalid width'));
  }

  if (typeof canvas.height !== 'number' || canvas.height <= 0) {
    issues.push(issue('error', 'canvas.height', 'Missing or invalid height'));
  }

  return { valid: issues.every((i) => i.severity !== 'error'), issues };
}

function validateDraggables(activity: Record<string, unknown>): ValidationResult {
  const issues: ValidationIssue[] = [];
  const draggables = activity.draggables as Array<Record<string, unknown>> | undefined;

  if (!Array.isArray(draggables) || draggables.length === 0) {
    issues.push(issue('error', 'draggables', 'Missing or empty draggables array'));
    return { valid: false, issues };
  }

  const ids = new Set<string>();

  for (let i = 0; i < draggables.length; i++) {
    const d = draggables[i];
    const prefix = `draggables[${i}]`;

    if (typeof d.id !== 'string' || !d.id) {
      issues.push(issue('error', `${prefix}.id`, 'Missing draggable id'));
    } else {
      if (ids.has(d.id as string)) {
        issues.push(issue('error', `${prefix}.id`, `Duplicate draggable id "${d.id}"`));
      }
      ids.add(d.id as string);
    }

    if (typeof d.contentType !== 'string' || !d.contentType) {
      issues.push(issue('error', `${prefix}.contentType`, 'Missing contentType'));
    }

    const pos = d.position as Record<string, unknown> | undefined;
    if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
      issues.push(issue('error', `${prefix}.position`, 'Missing or invalid position (x, y)'));
    }

    const dim = d.dimensions as Record<string, unknown> | undefined;
    if (!dim || typeof dim.width !== 'number' || typeof dim.height !== 'number') {
      issues.push(issue('error', `${prefix}.dimensions`, 'Missing or invalid dimensions (width, height)'));
    }

    const acc = d.accessibility as Record<string, unknown> | undefined;
    if (!acc || typeof acc.screenReaderLabel !== 'string') {
      issues.push(issue('error', `${prefix}.accessibility.screenReaderLabel`, 'Missing screenReaderLabel'));
    }
  }

  return { valid: issues.every((i) => i.severity !== 'error'), issues };
}

function validateDropZones(activity: Record<string, unknown>): ValidationResult {
  const issues: ValidationIssue[] = [];
  const zones = activity.dropZones as Array<Record<string, unknown>> | undefined;

  if (!Array.isArray(zones) || zones.length === 0) {
    issues.push(issue('error', 'dropZones', 'Missing or empty dropZones array'));
    return { valid: false, issues };
  }

  const ids = new Set<string>();

  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    const prefix = `dropZones[${i}]`;

    if (typeof z.id !== 'string' || !z.id) {
      issues.push(issue('error', `${prefix}.id`, 'Missing dropZone id'));
    } else {
      if (ids.has(z.id as string)) {
        issues.push(issue('error', `${prefix}.id`, `Duplicate dropZone id "${z.id}"`));
      }
      ids.add(z.id as string);
    }

    const shape = z.shape as Record<string, unknown> | undefined;
    if (!shape || typeof shape.type !== 'string') {
      issues.push(issue('error', `${prefix}.shape.type`, 'Missing shape type'));
    } else {
      const pos = shape.position as Record<string, unknown> | undefined;
      if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
        issues.push(issue('error', `${prefix}.shape.position`, 'Missing or invalid shape position'));
      }
    }

    if (!Array.isArray(z.acceptedDraggableIds) || z.acceptedDraggableIds.length === 0) {
      issues.push(issue('error', `${prefix}.acceptedDraggableIds`, 'Missing or empty acceptedDraggableIds'));
    }

    const acc = z.accessibility as Record<string, unknown> | undefined;
    if (!acc || typeof acc.screenReaderLabel !== 'string') {
      issues.push(issue('error', `${prefix}.accessibility.screenReaderLabel`, 'Missing screenReaderLabel'));
    }
  }

  return { valid: issues.every((i) => i.severity !== 'error'), issues };
}

function validateValidation(activity: Record<string, unknown>): ValidationResult {
  const issues: ValidationIssue[] = [];
  const validation = activity.validation as Record<string, unknown> | undefined;

  if (!validation || typeof validation !== 'object') {
    issues.push(issue('error', 'validation', 'Missing validation object'));
    return { valid: false, issues };
  }

  if (typeof validation.strategy !== 'string' || !validation.strategy) {
    issues.push(issue('error', 'validation.strategy', 'Missing required validation strategy'));
  }

  return { valid: issues.every((i) => i.severity !== 'error'), issues };
}

function validateAccessibility(activity: Record<string, unknown>): ValidationResult {
  const issues: ValidationIssue[] = [];
  const acc = activity.accessibility as Record<string, unknown> | undefined;

  if (!acc || typeof acc !== 'object') {
    issues.push(issue('warning', 'accessibility', 'Missing accessibility object'));
    return { valid: true, issues };
  }

  const sr = acc.screenReader as Record<string, unknown> | undefined;
  if (!sr || typeof sr.activityInstructionKey !== 'string') {
    issues.push(issue('error', 'accessibility.screenReader.activityInstructionKey', 'Missing required activityInstructionKey'));
  }

  return { valid: issues.every((i) => i.severity !== 'error'), issues };
}

function validateLocalization(activity: Record<string, unknown>): ValidationResult {
  const issues: ValidationIssue[] = [];
  const l10n = activity.localization as Record<string, unknown> | undefined;

  if (!l10n || typeof l10n !== 'object') {
    issues.push(issue('error', 'localization', 'Missing localization object'));
    return { valid: false, issues };
  }

  if (typeof l10n.keyNamespace !== 'string' || !l10n.keyNamespace) {
    issues.push(issue('error', 'localization.keyNamespace', 'Missing required keyNamespace'));
  }

  return { valid: issues.every((i) => i.severity !== 'error'), issues };
}

function validateAssets(activity: Record<string, unknown>): ValidationResult {
  const issues: ValidationIssue[] = [];
  const assets = activity.assets as Record<string, unknown> | undefined;

  if (!assets || typeof assets !== 'object') {
    issues.push(issue('error', 'assets', 'Missing assets object'));
    return { valid: false, issues };
  }

  if (!Array.isArray(assets.required)) {
    issues.push(issue('error', 'assets.required', 'Missing required assets array'));
  }

  return { valid: issues.every((i) => i.severity !== 'error'), issues };
}

/**
 * Cross-reference consistency:
 * - Every non-distractor draggable must appear in at least one zone's acceptedDraggableIds
 * - Every ID referenced in acceptedDraggableIds must exist in draggables[]
 */
function validateDraggableZoneConsistency(activity: Record<string, unknown>): ValidationResult {
  const issues: ValidationIssue[] = [];
  const draggables = activity.draggables as Array<Record<string, unknown>> | undefined;
  const zones = activity.dropZones as Array<Record<string, unknown>> | undefined;

  if (!Array.isArray(draggables) || !Array.isArray(zones)) {
    return { valid: true, issues }; // Other validators already flagged this
  }

  const draggableIds = new Set(draggables.map((d) => d.id as string));
  const acceptedIds = new Set<string>();

  for (const zone of zones) {
    const accepted = zone.acceptedDraggableIds as string[] | undefined;
    if (Array.isArray(accepted)) {
      for (const id of accepted) {
        acceptedIds.add(id);
        if (!draggableIds.has(id)) {
          issues.push(issue('error', `dropZones.acceptedDraggableIds`, `Zone "${zone.id}" references unknown draggable "${id}"`));
        }
      }
    }
  }

  for (const d of draggables) {
    const isDistractor = (d.distractorFlag as boolean) === true;
    if (!isDistractor && !acceptedIds.has(d.id as string)) {
      issues.push(issue('warning', `draggables`, `Draggable "${d.id}" is not accepted by any drop zone and is not a distractor`));
    }
  }

  return { valid: issues.every((i) => i.severity !== 'error'), issues };
}

// ---------------------------------------------------------------------------
// Exported validator class
// ---------------------------------------------------------------------------

export class DragDropValidator implements import('../types').ActivityValidator {
  validate(
    activity: Record<string, unknown>,
    context: { fileName: string; curriculumNodes: Map<string, CurriculumNode> },
  ): ValidationResult {
    const result = mergeResults(
      validateRoot(activity),
      validateEngine(activity),
      validateCurriculumRef(activity, context.curriculumNodes),
      validateMetadata(activity),
      validateCanvas(activity),
      validateDraggables(activity),
      validateDropZones(activity),
      validateValidation(activity),
      validateAccessibility(activity),
      validateLocalization(activity),
      validateAssets(activity),
      validateDraggableZoneConsistency(activity),
    );

    // Tag all issues with file context
    for (const i of result.issues) {
      i.fileName = context.fileName;
      i.activityId = activity.id as string | undefined;
    }

    return result;
  }
}
