import React from 'react';
import { WriteContent } from './WriteContent';

/**
 * Trace & Draw, desktop layout — a 300px mentor rail, mouse-oriented coaching,
 * and no tutorial hand: this variant shipped without one and that stays true
 * (spec §1). See `WriteContent` for the implementation (spec §28).
 */
export const WriteDesktop: React.FC = () => <WriteContent variant="desktop" />;

export default WriteDesktop;
