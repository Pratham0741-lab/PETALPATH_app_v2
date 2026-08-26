import React from 'react';
import { WriteContent } from './WriteContent';

/**
 * Trace & Draw, phone layout. The implementation lives in `WriteContent` so all
 * three device variants stay one screen (spec §28).
 */
export const WriteMobile: React.FC = () => <WriteContent variant="mobile" />;

export default WriteMobile;
