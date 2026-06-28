/**
 * Legacy shim — re-exports from the new centralized config.
 *
 * @deprecated Import from '../config/api' instead.
 * This file exists only so that any missed import still compiles.
 */
export { API_BASE_URL as BACKEND_URL, API_URL } from './api';
