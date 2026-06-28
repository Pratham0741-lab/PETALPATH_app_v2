/**
 * API Barrel Export
 *
 * Import any API function from a single entry point:
 *   import { login, getRoadmap, checkServerHealth } from '../api';
 */

export { api } from './client';
export { ApiError, toUserMessage } from './errors';
export { checkServerHealth } from './health';

export * as authApi from './auth';
export * as childrenApi from './children';
export * as roadmapApi from './roadmap';
export * as progressApi from './progress';
export * as rewardsApi from './rewards';
export * as mentorsApi from './mentors';
export * as mediaApi from './media';
