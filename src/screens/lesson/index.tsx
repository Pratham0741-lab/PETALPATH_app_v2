import React from 'react';
import { useDeviceType } from '../../hooks/useDeviceType';
import { LessonOverviewMobile } from './LessonOverviewMobile';
import { LessonOverviewTablet } from './LessonOverviewTablet';
import { LessonOverviewDesktop } from './LessonOverviewDesktop';

export const LessonOverviewScreen: React.FC = () => {
  const deviceType = useDeviceType();

  switch (deviceType) {
    case 'mobile':
      return <LessonOverviewMobile />;
    case 'tablet':
      return <LessonOverviewTablet />;
    case 'desktop':
      return <LessonOverviewDesktop />;
  }
};

export default LessonOverviewScreen;
