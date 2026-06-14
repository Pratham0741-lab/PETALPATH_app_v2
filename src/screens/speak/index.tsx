import React from 'react';
import { useDeviceType } from '../../hooks/useDeviceType';
import { SpeakMobile } from './SpeakMobile';
import { SpeakTablet } from './SpeakTablet';
import { SpeakDesktop } from './SpeakDesktop';

export const SpeakScreen: React.FC = () => {
  const deviceType = useDeviceType();

  switch (deviceType) {
    case 'mobile':
      return <SpeakMobile />;
    case 'tablet':
      return <SpeakTablet />;
    case 'desktop':
      return <SpeakDesktop />;
  }
};

export default SpeakScreen;
