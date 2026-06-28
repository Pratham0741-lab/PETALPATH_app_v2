/**
 * Auth API
 *
 * Clean functions for all authentication endpoints.
 */

import { api } from './client';

export function login(email: string, password: string) {
  return api.post('/auth/login', { email, password });
}

export function register(name: string, email: string, password: string) {
  return api.post('/auth/register', { name, email, password });
}

export function loginWithGoogle(idToken: string) {
  return api.post('/auth/google', { idToken });
}

export function forgotPassword(email: string) {
  return api.post('/auth/forgot-password', { email });
}

export function resetPassword(token: string, newPassword: string) {
  return api.post('/auth/reset-password', { token, newPassword });
}

export function logout(refreshToken: string) {
  return api.post('/auth/logout', { refreshToken });
}

export function selectChild(childId: string) {
  return api.post('/auth/select-child', { childId });
}
