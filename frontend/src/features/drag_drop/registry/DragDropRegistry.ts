/**
 * Drag & Drop Engine Registration — PetalPath Feature Module
 */

import { ActivityRegistry } from '../../../core/activity-registry/ActivityRegistry';
import { DragDropRenderer } from '../renderer/DragDropRenderer';
import { localActivityRepository } from '../../../core/activity-repository/LocalActivityRepository';

export function registerDragDropEngine(): void {
  ActivityRegistry.register({
    engineId: 'petalpath:engine:drag-drop',
    activityType: 'drag_drop',
    renderer: DragDropRenderer,
    repository: localActivityRepository,
    capabilities: ['drag-and-drop', 'snap-to-target', 'progressive-hints'],
    supportedSchemaVersions: ['2.1.0', '2.0.0'],
  });
}

// Auto-register on import
registerDragDropEngine();
