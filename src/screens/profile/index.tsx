import React from 'react';
import { useDeviceType } from '../../hooks/useDeviceType';
import { ProfileMobile } from './ProfileMobile';
import { ProfileTablet } from './ProfileTablet';
import { ProfileDesktop } from './ProfileDesktop';

export const ProfileScreen: React.FC = () => {
  const deviceType = useDeviceType();

  switch (deviceType) {
    case 'mobile':
      return <ProfileMobile />;
    case 'tablet':
      return <ProfileTablet />;
    case 'desktop':
      return <ProfileDesktop />;
  }
};

export default ProfileScreen;
