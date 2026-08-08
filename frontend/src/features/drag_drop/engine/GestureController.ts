/**
 * Gesture Controller — PetalPath Drag & Drop Engine
 * Pure pan & pointer gesture tracking without game or validation logic.
 */

import { ActivityEventBus } from '../../../core/event-bus/eventBus';

export interface DragGestureEvent {
  draggableId: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  distance: number;
}

export class GestureController {
  private activeDraggableId: string | null = null;
  private startX = 0;
  private startY = 0;
  private currentX = 0;
  private currentY = 0;

  constructor(private eventBus: ActivityEventBus) {}

  onDragStart(draggableId: string, x: number, y: number): void {
    this.activeDraggableId = draggableId;
    this.startX = x;
    this.startY = y;
    this.currentX = x;
    this.currentY = y;

    this.eventBus.emit('DRAG_STARTED', {
      draggableId,
      x,
      y,
      dx: 0,
      dy: 0,
      distance: 0,
    });
  }

  onDragMove(draggableId: string, x: number, y: number): void {
    if (this.activeDraggableId !== draggableId) return;

    const dx = x - this.currentX;
    const dy = y - this.currentY;
    const distance = Math.hypot(dx, dy);

    this.currentX = x;
    this.currentY = y;

    this.eventBus.emit('DRAG_MOVED', {
      draggableId,
      x,
      y,
      dx,
      dy,
      distance,
    });
  }

  onDragEnd(draggableId: string, x: number, y: number): DragGestureEvent | null {
    if (this.activeDraggableId !== draggableId) return null;

    const totalDx = x - this.startX;
    const totalDy = y - this.startY;
    const totalDistance = Math.hypot(totalDx, totalDy);

    const event: DragGestureEvent = {
      draggableId,
      x,
      y,
      dx: totalDx,
      dy: totalDy,
      distance: totalDistance,
    };

    this.activeDraggableId = null;
    this.eventBus.emit('DRAG_ENDED', event);

    return event;
  }

  getActiveDraggableId(): string | null {
    return this.activeDraggableId;
  }
}
