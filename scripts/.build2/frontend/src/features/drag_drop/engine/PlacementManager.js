"use strict";
/**
 * Placement Manager — PetalPath Drag & Drop Subsystem
 * Determines candidate drop zone, magnetic attraction, snap radius, and collision overlaps.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlacementManager = void 0;
const CollisionStrategy_1 = require("../../../core/collision/CollisionStrategy");
class PlacementManager {
    constructor() {
        this.strategies = new Map();
        this.registerStrategy(new CollisionStrategy_1.BoundingBoxStrategy());
        this.registerStrategy(new CollisionStrategy_1.CircleStrategy());
        this.registerStrategy(new CollisionStrategy_1.PolygonStrategy());
        this.registerStrategy(new CollisionStrategy_1.DistanceStrategy());
    }
    registerStrategy(strategy) {
        this.strategies.set(strategy.type, strategy);
    }
    findPlacementTarget(dropPoint, dropZones, snappingConfig) {
        const snapRadius = snappingConfig?.snapRadius ?? 80;
        let closestZone = null;
        let minDistance = Infinity;
        for (const zone of dropZones) {
            const shapeType = zone.shape.type;
            const strategy = this.strategies.get(shapeType) || this.strategies.get('rectangle');
            const zoneRect = {
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
exports.PlacementManager = PlacementManager;
