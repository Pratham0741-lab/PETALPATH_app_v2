import React from 'react';
import { useDeviceType } from '../../hooks/useDeviceType';
import { JourneyMobile } from './JourneyMobile';
import { JourneyTablet } from './JourneyTablet';
import { JourneyDesktop } from './JourneyDesktop';

export const JourneyScreen: React.FC = () => {
  const deviceType = useDeviceType();

  switch (deviceType) {
    case 'mobile':
      return <JourneyMobile />;
    case 'tablet':
      return <JourneyTablet />;
    case 'desktop':
      return <JourneyDesktop />;
  }
};

export default JourneyScreen;
