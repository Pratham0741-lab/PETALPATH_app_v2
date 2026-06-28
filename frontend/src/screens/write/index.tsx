import React from 'react';
import { useDeviceType } from '../../hooks/useDeviceType';
import { WriteMobile } from './WriteMobile';
import { WriteTablet } from './WriteTablet';
import { WriteDesktop } from './WriteDesktop';

export const WriteScreen: React.FC = () => {
  const deviceType = useDeviceType();

  switch (deviceType) {
    case 'mobile':
      return <WriteMobile />;
    case 'tablet':
      return <WriteTablet />;
    case 'desktop':
      return <WriteDesktop />;
  }
};

export default WriteScreen;
