import React from 'react';
import { DragDropRenderer } from '../../features/drag_drop/renderer/DragDropRenderer';
import type { DragDropSpec as LegacyDragDropSpec } from './types';
import type { DragDropActivitySpec } from '../../features/drag_drop/types';

type Props = {
  spec: LegacyDragDropSpec | DragDropActivitySpec;
  activityId?: string;
  onExit: () => void;
  onNext?: () => void;
};

export const DragDropMatch: React.FC<Props> = ({ spec, activityId, onExit, onNext }) => {
  // If spec contains full v2.1.0 activity structure or canvas property
  if (spec && ('canvas' in spec || 'id' in spec)) {
    return (
      <DragDropRenderer
        activityId={activityId}
        initialSpec={spec as DragDropActivitySpec}
        onExit={onExit}
        onNext={onNext}
      />
    );
  }

  // Fallback to DragDropRenderer with activityId
  return <DragDropRenderer activityId={activityId} onExit={onExit} onNext={onNext} />;
};
