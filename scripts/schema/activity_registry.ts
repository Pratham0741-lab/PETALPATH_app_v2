/**
 * Activity Registry — lookup table for activity types.
 *
 * Adding a new activity type = registering a new entry here.
 * The sync and validate CLIs look up the requested type from this registry.
 */

import type { ActivitySchemaDefinition } from './types';
import { DragDropValidator } from './drag_drop/validator';
import { DragDropSynchronizer } from './drag_drop/synchronizer';

const registry = new Map<string, ActivitySchemaDefinition>();

// ---------------------------------------------------------------------------
// drag_drop
// ---------------------------------------------------------------------------

registry.set('drag_drop', {
  activityType: 'drag_drop',
  specVersion: '2.1.0',
  activitiesDir: 'curriculum/activities/drag_drop',
  manifestFile: 'curriculum/activities/drag_drop_manifest.json',
  validator: new DragDropValidator(),
  synchronizer: new DragDropSynchronizer(),
});

// ---------------------------------------------------------------------------
// Future registrations (uncomment when specs exist):
//
// registry.set('trace', { ... });
// registry.set('tap', { ... });
// registry.set('quiz', { ... });
// ---------------------------------------------------------------------------

export function getSchema(activityType: string): ActivitySchemaDefinition {
  const schema = registry.get(activityType);
  if (!schema) {
    const known = Array.from(registry.keys()).join(', ');
    throw new Error(
      `Unknown activity type "${activityType}". Registered types: ${known}`,
    );
  }
  return schema;
}

export function listRegisteredTypes(): string[] {
  return Array.from(registry.keys());
}
