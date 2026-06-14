import React from 'react';
import { useDeviceType } from '../../hooks/useDeviceType';
import { ListenMobile } from './ListenMobile';
import { ListenTablet } from './ListenTablet';
import { ListenDesktop } from './ListenDesktop';

export const ListenScreen: React.FC = () => {
  const deviceType = useDeviceType();

  switch (deviceType) {
    case 'mobile':
      return <ListenMobile />;
    case 'tablet':
      return <ListenTablet />;
    case 'desktop':
      return <ListenDesktop />;
  }
};

export default ListenScreen;
