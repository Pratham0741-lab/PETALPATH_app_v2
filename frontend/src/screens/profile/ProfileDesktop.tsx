/**
 * My Profile, desktop layout — the widest reading column. See `ProfileContent`.
 *
 * This used to render `ProfileTablet` directly; it now takes its own variant so
 * the column cap can differ without the two screens sharing state.
 */

import React from 'react';
import { ProfileContent } from './ProfileContent';

export const ProfileDesktop: React.FC = () => <ProfileContent variant="desktop" />;

export default ProfileDesktop;
