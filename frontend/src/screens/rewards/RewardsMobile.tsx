/**
 * My Rewards, phone layout. See `RewardsContent` for the implementation — the
 * three device files are kept so `screens/rewards/index.tsx` and any existing
 * import keep working (§1), but they no longer each carry their own copy of the
 * screen (§28).
 */

import React from 'react';
import { RewardsContent } from './RewardsContent';

export const RewardsMobile: React.FC = () => <RewardsContent variant="mobile" />;

export default RewardsMobile;
