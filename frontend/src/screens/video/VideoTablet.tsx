import React from 'react';
import { VideoContent } from './VideoContent';

/**
 * Watch (video lesson), tablet layout — a 720px player titled after the lesson.
 * See `VideoContent` for the implementation (spec §28).
 */
export const VideoTablet: React.FC = () => <VideoContent variant="tablet" />;

export default VideoTablet;
