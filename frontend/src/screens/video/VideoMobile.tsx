import React from 'react';
import { VideoContent } from './VideoContent';

/**
 * Watch (video lesson), phone layout. The implementation lives in
 * `VideoContent` so all three device variants stay one screen (spec §28).
 */
export const VideoMobile: React.FC = () => <VideoContent variant="mobile" />;

export default VideoMobile;
