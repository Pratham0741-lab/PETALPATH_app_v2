import React from 'react';
import { ListenContent } from './ListenContent';

/**
 * Listen & Choose, phone layout. The implementation lives in `ListenContent`
 * so all three device variants stay one screen (spec §28).
 */
export const ListenMobile: React.FC = () => <ListenContent variant="mobile" />;

export default ListenMobile;
