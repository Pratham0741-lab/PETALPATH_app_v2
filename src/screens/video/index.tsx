import React from 'react';
import { useDeviceType } from '../../hooks/useDeviceType';
import { VideoMobile } from './VideoMobile';
import { VideoTablet } from './VideoTablet';
import { VideoDesktop } from './VideoDesktop';

export const VideoScreen: React.FC = () => {
  const deviceType = useDeviceType();

  switch (deviceType) {
    case 'mobile':
      return <VideoMobile />;
    case 'tablet':
      return <VideoTablet />;
    case 'desktop':
      return <VideoDesktop />;
  }
};

export default VideoScreen;

