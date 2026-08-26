import React from 'react';
import { VideoContent } from './VideoContent';

/**
 * Watch (video lesson), desktop layout — an 840px player, and no tutorial hand:
 * this variant shipped without one and that stays true (spec §1).
 * See `VideoContent` for the implementation (spec §28).
 */
export const VideoDesktop: React.FC = () => <VideoContent variant="desktop" />;

export default VideoDesktop;
