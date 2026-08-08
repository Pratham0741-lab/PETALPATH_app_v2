/**
 * Collision Strategy Pattern — PetalPath Core
 * Pluggable hit-testing and overlap detection for drag-drop, tap, draw, etc.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Rect2D {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CollisionResult {
  isColliding: boolean;
  distance: number;
  overlapArea: number;
}

export interface CollisionStrategy {
  type: string;
  testCollision(point: Point2D, targetRect: Rect2D, radius?: number): CollisionResult;
}

/**
 * 1. Bounding Box Strategy (AABB Rectangle Test)
 */
export class BoundingBoxStrategy implements CollisionStrategy {
  readonly type = 'rectangle';

  testCollision(point: Point2D, targetRect: Rect2D, radius = 0): CollisionResult {
    const minX = targetRect.x - radius;
    const maxX = targetRect.x + targetRect.width + radius;
    const minY = targetRect.y - radius;
    const maxY = targetRect.y + targetRect.height + radius;

    const isColliding = point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;

    const centerX = targetRect.x + targetRect.width / 2;
    const centerY = targetRect.y + targetRect.height / 2;
    const distance = Math.hypot(point.x - centerX, point.y - centerY);

    return {
      isColliding,
      distance,
      overlapArea: isColliding ? targetRect.width * targetRect.height : 0,
    };
  }
}

/**
 * 2. Circle / Radial Distance Strategy
 */
export class CircleStrategy implements CollisionStrategy {
  readonly type = 'circle';

  testCollision(point: Point2D, targetRect: Rect2D, snapRadius = 0): CollisionResult {
    const centerX = targetRect.x + targetRect.width / 2;
    const centerY = targetRect.y + targetRect.height / 2;
    const radius = Math.max(targetRect.width, targetRect.height) / 2 + snapRadius;

    const distance = Math.hypot(point.x - centerX, point.y - centerY);
    const isColliding = distance <= radius;

    return {
      isColliding,
      distance,
      overlapArea: isColliding ? Math.PI * radius * radius : 0,
    };
  }
}

/**
 * 3. Distance Centroid Strategy
 */
export class DistanceStrategy implements CollisionStrategy {
  readonly type = 'distance';

  testCollision(point: Point2D, targetRect: Rect2D, snapRadius = 100): CollisionResult {
    const centerX = targetRect.x + targetRect.width / 2;
    const centerY = targetRect.y + targetRect.height / 2;
    const distance = Math.hypot(point.x - centerX, point.y - centerY);

    return {
      isColliding: distance <= snapRadius,
      distance,
      overlapArea: 0,
    };
  }
}

/**
 * 4. Polygon / Outline Strategy (Point-in-Polygon test)
 */
export class PolygonStrategy implements CollisionStrategy {
  readonly type = 'polygon';

  testCollision(point: Point2D, targetRect: Rect2D): CollisionResult {
    // Fallback to bounding box if polygon points are not specified
    const bbox = new BoundingBoxStrategy();
    return bbox.testCollision(point, targetRect);
  }

  testPolygonPoints(point: Point2D, vertices: Point2D[]): boolean {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].x,
        yi = vertices[i].y;
      const xj = vertices[j].x,
        yj = vertices[j].y;

      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }
}
