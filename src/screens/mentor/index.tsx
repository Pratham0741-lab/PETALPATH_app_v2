import React from 'react';
import { useDeviceType } from '../../hooks/useDeviceType';
import { MentorMobile } from './MentorMobile';
import { MentorTablet } from './MentorTablet';
import { MentorDesktop } from './MentorDesktop';

export const MentorScreen: React.FC = () => {
  const deviceType = useDeviceType();

  switch (deviceType) {
    case 'mobile':
      return <MentorMobile />;
    case 'tablet':
      return <MentorTablet />;
    case 'desktop':
      return <MentorDesktop />;
  }
};

export default MentorScreen;
