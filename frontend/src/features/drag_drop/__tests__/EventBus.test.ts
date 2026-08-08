import { describe, beforeEach, test, expect, jest } from '@jest/globals';
import { ActivityEventBus } from '../../../core/event-bus/eventBus';

describe('ActivityEventBus Infrastructure', () => {
  let eventBus: ActivityEventBus;

  beforeEach(() => {
    eventBus = new ActivityEventBus();
  });

  test('should emit and receive events', () => {
    const callback = jest.fn();
    eventBus.on('ITEM_PLACED', callback);

    eventBus.emit('ITEM_PLACED', { draggableId: 'item-1', dropZoneId: 'zone-1' });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ITEM_PLACED',
        payload: { draggableId: 'item-1', dropZoneId: 'zone-1' },
      })
    );
  });

  test('should unsubscribe correctly', () => {
    const callback = jest.fn();
    const unsub = eventBus.on('DRAG_STARTED', callback);

    unsub();
    eventBus.emit('DRAG_STARTED', { draggableId: 'item-1' });

    expect(callback).not.toHaveBeenCalled();
  });
});
