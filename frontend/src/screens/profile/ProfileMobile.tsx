/**
 * My Profile, phone layout. See `ProfileContent` for the implementation — the
 * three device files are kept so `screens/profile/index.tsx` and any existing
 * import keep working (§1), but they no longer each carry their own copy of the
 * screen (§28).
 */

import React from 'react';
import { ProfileContent } from './ProfileContent';

export const ProfileMobile: React.FC = () => <ProfileContent variant="mobile" />;

export default ProfileMobile;
