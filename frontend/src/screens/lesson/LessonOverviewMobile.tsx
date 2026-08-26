import React from 'react';
import { LessonOverviewContent } from './LessonOverviewContent';

/**
 * Mobile Lesson Overview. The screen lives in LessonOverviewContent — the
 * three variant files were near-identical copies, which is the duplication
 * spec §28 rules out.
 */
export const LessonOverviewMobile: React.FC = () => <LessonOverviewContent variant="mobile" />;

export default LessonOverviewMobile;
