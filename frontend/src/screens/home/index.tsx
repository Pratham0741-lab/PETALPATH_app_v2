import React from 'react';
import { useDeviceType } from '../../hooks/useDeviceType';
import { HomeMobile } from './HomeMobile';
import { HomeTablet } from './HomeTablet';
import { HomeDesktop } from './HomeDesktop';

export const HomeScreen: React.FC = () => {
  const deviceType = useDeviceType();

  switch (deviceType) {
    case 'mobile':
      return <HomeMobile />;
    case 'tablet':
      return <HomeTablet />;
    case 'desktop':
      return <HomeDesktop />;
  }
};

export default HomeScreen;
