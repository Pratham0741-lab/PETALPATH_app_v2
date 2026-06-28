import React from 'react';
import { useDeviceType } from '../../hooks/useDeviceType';
import { RewardsMobile } from './RewardsMobile';
import { RewardsTablet } from './RewardsTablet';
import { RewardsDesktop } from './RewardsDesktop';

export const RewardsScreen: React.FC = () => {
  const deviceType = useDeviceType();

  switch (deviceType) {
    case 'mobile':
      return <RewardsMobile />;
    case 'tablet':
      return <RewardsTablet />;
    case 'desktop':
      return <RewardsDesktop />;
  }
};

export default RewardsScreen;
