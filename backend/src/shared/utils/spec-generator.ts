/**
 * Dynamic Drag & Drop Activity Spec Generator — PetalPath Engine Utility
 *
 * Entry point only. The interesting work lives in `drag-drop/board.ts` (geometry,
 * colour, scoring, the seeded shuffle) and `drag-drop/blueprints.ts` (the actual
 * lesson content). This file just picks a blueprint for a node and hands it over.
 *
 * The exported name and the first two parameters are unchanged, so existing call
 * sites keep working; `topic` is new and optional. Pass
 * `node.curriculum?.original_topic` when you have it — it is what lets an
 * unmapped lesson degrade to something related to its own subject instead of a
 * generic letter board.
 */

import { buildSpec, type BuildOptions } from './drag-drop/board.js';
import { BLUEPRINTS, fallbackBlueprint } from './drag-drop/blueprints.js';

export { BLUEPRINTS, fallbackBlueprint } from './drag-drop/blueprints.js';
export { buildSpec, TILE_COLORS } from './drag-drop/board.js';

/** True when this node has hand-authored content rather than a derived fallback. */
export function hasBlueprint(nodeId: string): boolean {
  return Object.prototype.hasOwnProperty.call(BLUEPRINTS, nodeId);
}

export function generateDynamicDragDropSpec(
  nodeId: string,
  title: string,
  topic?: string,
  opts: BuildOptions = {}
): any {
  const blueprint = BLUEPRINTS[nodeId] ?? fallbackBlueprint(nodeId, title, topic);
  return buildSpec(nodeId, title || nodeId, blueprint, opts);
}
