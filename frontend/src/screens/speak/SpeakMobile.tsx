import React from 'react';
import { SpeakContent } from './SpeakContent';

/**
 * Speak & Learn, phone layout. The implementation lives in `SpeakContent` so
 * all three device variants stay one screen (spec §28).
 */
export const SpeakMobile: React.FC = () => <SpeakContent variant="mobile" />;

export default SpeakMobile;
