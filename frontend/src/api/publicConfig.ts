import { api } from './client';
import { createPublicConfigLoader } from '../features/publicConfig/publicConfig';

/** Cached per app run; resolves to { passwordResetEmail: false } on any failure. */
export const getPublicConfig = createPublicConfigLoader(() => api.get('/config/public'));
