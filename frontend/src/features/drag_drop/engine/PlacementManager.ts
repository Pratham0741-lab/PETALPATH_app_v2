/**
 * Placement Manager — PetalPath Drag & Drop Subsystem
 * Determines candidate drop zone, magnetic attraction, snap radius, and collision overlaps.
 */

import { DropZone, InteractionSnapping } from '../types';
import {
  Point2D,
  Rect2D,
  CollisionStrategy,
  BoundingBoxStrategy,
  CircleStrategy,
  PolygonStrategy,
  DistanceStrategy,
} from '../../../core/collision/CollisionStrategy';

export interface ProposedPlacement {
  dropZoneId: string | null;
  snappedPosition: Point2D | null;
  isSnapped: boolean;
  distance: number;
}

export class PlacementManager {
  private strategies: Map<string, CollisionStrategy> = new Map();

  constructor() {
    this.registerStrategy(new BoundingBoxStrategy());
    this.registerStrategy(new CircleStrategy());
    this.registerStrategy(new PolygonStrategy());
    this.registerStrategy(new DistanceStrategy());
  }

  registerStrategy(strategy: CollisionStrategy): void {
    this.strategies.set(strategy.type, strategy);
  }

  findPlacementTarget(
    dropPoint: Point2D,
    dropZones: DropZone[],
    snappingConfig?: InteractionSnapping
  ): ProposedPlacement {
    const snapRadius = snappingConfig?.snapRadius ?? 80;
    let closestZone: DropZone | null = null;
    let minDistance = Infinity;

    for (const zone of dropZones) {
      const shapeType = zone.shape.type;
      const strategy = this.strategies.get(shapeType) || this.strategies.get('rectangle')!;

      const zoneRect: Rect2D = {
        x: zone.shape.position.x,
        y: zone.shape.position.y,
        width: zone.shape.dimensions.width,
        height: zone.shape.dimensions.height,
      };

      const effectiveRadius = zone.snapping?.snapRadius ?? snapRadius;
      const result = strategy.testCollision(dropPoint, zoneRect, effectiveRadius);

      if (result.isColliding && result.distance < minDistance) {
        minDistance = result.distance;
        closestZone = zone;
      }
    }

    if (!closestZone) {
      return {
        dropZoneId: null,
        snappedPosition: null,
        isSnapped: false,
        distance: Infinity,
      };
    }

    // Calculate snapped center coordinate
    const snapX = closestZone.shape.position.x + closestZone.shape.dimensions.width / 2;
    const snapY = closestZone.shape.position.y + closestZone.shape.dimensions.height / 2;

    return {
      dropZoneId: closestZone.id,
      snappedPosition: { x: snapX, y: snapY },
      isSnapped: true,
      distance: minDistance,
    };
  }
}
