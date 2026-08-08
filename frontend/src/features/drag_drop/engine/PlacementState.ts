/**
 * Placement State Manager — PetalPath Drag & Drop Engine
 * Tracks active item placements across drop zones.
 */

export interface PlacedItem {
  draggableId: string;
  dropZoneId: string;
  placedAt: number;
  isLocked: boolean;
}

export class PlacementState {
  private placements: Map<string, string> = new Map(); // zoneId -> draggableId
  private itemToZone: Map<string, string> = new Map(); // draggableId -> zoneId
  private lockedItems: Set<string> = new Set(); // draggableId

  placeItem(draggableId: string, zoneId: string, isLocked = false): void {
    // If item was placed elsewhere, remove from old zone
    const oldZone = this.itemToZone.get(draggableId);
    if (oldZone) {
      this.placements.delete(oldZone);
    }

    this.placements.set(zoneId, draggableId);
    this.itemToZone.set(draggableId, zoneId);

    if (isLocked) {
      this.lockedItems.add(draggableId);
    }
  }

  removeItem(draggableId: string): void {
    const zoneId = this.itemToZone.get(draggableId);
    if (zoneId) {
      this.placements.delete(zoneId);
    }
    this.itemToZone.delete(draggableId);
    this.lockedItems.delete(draggableId);
  }

  getItemInZone(zoneId: string): string | undefined {
    return this.placements.get(zoneId);
  }

  getZoneForItem(draggableId: string): string | undefined {
    return this.itemToZone.get(draggableId);
  }

  isItemLocked(draggableId: string): boolean {
    return this.lockedItems.has(draggableId);
  }

  getAllPlacements(): Record<string, string> {
    const result: Record<string, string> = {};
    this.placements.forEach((draggableId, zoneId) => {
      result[zoneId] = draggableId;
    });
    return result;
  }

  getPlacedCount(): number {
    return this.placements.size;
  }

  clear(): void {
    this.placements.clear();
    this.itemToZone.clear();
    this.lockedItems.clear();
  }
}
