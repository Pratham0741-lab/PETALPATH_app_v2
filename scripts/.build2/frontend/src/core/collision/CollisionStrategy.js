"use strict";
/**
 * Collision Strategy Pattern — PetalPath Core
 * Pluggable hit-testing and overlap detection for drag-drop, tap, draw, etc.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolygonStrategy = exports.DistanceStrategy = exports.CircleStrategy = exports.BoundingBoxStrategy = void 0;
/**
 * 1. Bounding Box Strategy (AABB Rectangle Test)
 */
class BoundingBoxStrategy {
    constructor() {
        this.type = 'rectangle';
    }
    testCollision(point, targetRect, radius = 0) {
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
exports.BoundingBoxStrategy = BoundingBoxStrategy;
/**
 * 2. Circle / Radial Distance Strategy
 */
class CircleStrategy {
    constructor() {
        this.type = 'circle';
    }
    testCollision(point, targetRect, snapRadius = 0) {
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
exports.CircleStrategy = CircleStrategy;
/**
 * 3. Distance Centroid Strategy
 */
class DistanceStrategy {
    constructor() {
        this.type = 'distance';
    }
    testCollision(point, targetRect, snapRadius = 100) {
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
exports.DistanceStrategy = DistanceStrategy;
/**
 * 4. Polygon / Outline Strategy (Point-in-Polygon test)
 */
class PolygonStrategy {
    constructor() {
        this.type = 'polygon';
    }
    testCollision(point, targetRect) {
        // Fallback to bounding box if polygon points are not specified
        const bbox = new BoundingBoxStrategy();
        return bbox.testCollision(point, targetRect);
    }
    testPolygonPoints(point, vertices) {
        let inside = false;
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const xi = vertices[i].x, yi = vertices[i].y;
            const xj = vertices[j].x, yj = vertices[j].y;
            const intersect = yi > point.y !== yj > point.y &&
                point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
            if (intersect)
                inside = !inside;
        }
        return inside;
    }
}
exports.PolygonStrategy = PolygonStrategy;
