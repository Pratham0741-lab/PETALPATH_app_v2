import React from 'react';
import { HomeContent } from './HomeContent';

/**
 * Mobile Home. The screen itself lives in HomeContent — the three device
 * variants used to be ~1660-line copies of each other, which is the exact
 * duplication spec §28 rules out.
 */
export const HomeMobile: React.FC = () => <HomeContent variant="mobile" />;

export default HomeMobile;
