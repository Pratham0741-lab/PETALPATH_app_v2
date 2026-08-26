import React from 'react';
import { WriteContent } from './WriteContent';

/**
 * Trace & Draw, tablet layout — the board beside a 280px "Write Guide" rail.
 * See `WriteContent` for the implementation (spec §28).
 */
export const WriteTablet: React.FC = () => <WriteContent variant="tablet" />;

export default WriteTablet;
