/**
 * Generic Activity Engine Registry — PetalPath Core System
 */

import type React from 'react';

export interface ActivityManifest<TActivitySpec = any> {
  engineId: string; // e.g. "petalpath:engine:drag-drop"
  activityType: string; // e.g. "drag_drop"
  renderer: React.ComponentType<{ activity: TActivitySpec; onExit: () => void }>;
  repository?: any;
  capabilities: string[];
  supportedSchemaVersions: string[];
}

class ActivityRegistryImpl {
  private registry = new Map<string, ActivityManifest>();

  register(manifest: ActivityManifest): void {
    this.registry.set(manifest.activityType, manifest);
    this.registry.set(manifest.engineId, manifest);
  }

  get(typeOrId: string): ActivityManifest | undefined {
    return this.registry.get(typeOrId);
  }

  has(typeOrId: string): boolean {
    return this.registry.has(typeOrId);
  }

  listRegisteredEngines(): string[] {
    return Array.from(this.registry.keys());
  }
}

export const ActivityRegistry = new ActivityRegistryImpl();
