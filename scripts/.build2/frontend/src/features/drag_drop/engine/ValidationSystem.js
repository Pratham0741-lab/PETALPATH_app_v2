"use strict";
/**
 * Validation System — PetalPath Drag & Drop Subsystem
 * Pure correctness evaluator supporting all 6 validation strategies.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationSystem = void 0;
class ValidationSystem {
    constructor() {
        this.customValidators = new Map();
    }
    registerCustomValidator(id, validator) {
        this.customValidators.set(id, validator);
    }
    evaluateDrop(draggableId, dropZoneId, config, dropZones, currentPlacements) {
        const targetZone = dropZones.find((z) => z.id === dropZoneId);
        if (!targetZone) {
            return { isValid: false, isPartial: false, isComplete: false, reason: 'Invalid drop zone' };
        }
        switch (config.strategy) {
            case 'one-to-one':
            case 'one-to-many':
            case 'many-to-one':
            case 'unordered': {
                const isAccepted = targetZone.acceptedDraggableIds.includes(draggableId) ||
                    targetZone.acceptedDraggableIds.includes('*');
                return {
                    isValid: isAccepted,
                    isPartial: isAccepted,
                    isComplete: false, // Overall activity completeness checked separately
                };
            }
            case 'ordered-sequence': {
                if (!config.orderedSequence || config.orderedSequence.length === 0) {
                    const isAccepted = targetZone.acceptedDraggableIds.includes(draggableId);
                    return { isValid: isAccepted, isPartial: isAccepted, isComplete: false };
                }
                const nextExpectedItem = config.orderedSequence[Object.keys(currentPlacements).length];
                const isValid = draggableId === nextExpectedItem;
                return {
                    isValid,
                    isPartial: isValid,
                    isComplete: false,
                };
            }
            case 'custom': {
                if (config.customValidatorId && this.customValidators.has(config.customValidatorId)) {
                    const customFn = this.customValidators.get(config.customValidatorId);
                    const isValid = customFn(draggableId, dropZoneId, currentPlacements);
                    return { isValid, isPartial: isValid, isComplete: false };
                }
                // Default fallback to acceptedDraggableIds check
                const isAccepted = targetZone.acceptedDraggableIds.includes(draggableId);
                return { isValid: isAccepted, isPartial: isAccepted, isComplete: false };
            }
            default:
                return { isValid: false, isPartial: false, isComplete: false };
        }
    }
    evaluateOverallCompletion(totalDraggables, placements, dropZones, config) {
        const placedCount = Object.keys(placements).length;
        const requiredTargetCount = dropZones.length;
        if (placedCount < requiredTargetCount)
            return false;
        // Check all placements validity
        return Object.entries(placements).every(([zoneId, draggableId]) => {
            const zone = dropZones.find((z) => z.id === zoneId);
            return zone ? zone.acceptedDraggableIds.includes(draggableId) || zone.acceptedDraggableIds.includes('*') : false;
        });
    }
}
exports.ValidationSystem = ValidationSystem;
