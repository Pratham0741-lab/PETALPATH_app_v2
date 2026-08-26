/**
 * Magical Garden, phone layout. See `MentorContent` for the implementation — the
 * three device files are kept so `screens/mentor/index.tsx` and any existing
 * import keep working (§1), but they no longer each carry their own copy of the
 * screen (§28).
 */

import React from 'react';
import { MentorContent } from './MentorContent';

export const MentorMobile: React.FC = () => <MentorContent variant="mobile" />;

export default MentorMobile;
