/**
 * Media API
 *
 * Consolidated module for video, audio, listen, speak, and write
 * progress endpoints.
 */

import { api } from './client';

// ── Video ──────────────────────────────────────────────

export function getVideoProgress(videoId: string) {
  return api.get(`/video-progress/${videoId}`);
}

export function saveVideoProgress(data: {
  videoId: string;
  watchedSeconds: number;
  totalSeconds: number;
}) {
  return api.post('/video-progress', data);
}

export function completeVideo(data: {
  videoId: string;
  activityId: string;
  childId: string;
}) {
  return api.post('/video-progress/complete', data);
}

// ── Audio / Listen ─────────────────────────────────────

export function getListenProgress(activityId: string) {
  return api.get(`/listen-progress/${activityId}`);
}

// ── Speak ──────────────────────────────────────────────

export function getSpeakProgress(activityId: string) {
  return api.get(`/speak-progress/${activityId}`);
}

// ── Write ──────────────────────────────────────────────

export function getWriteProgress(activityId: string) {
  return api.get(`/write-progress/${activityId}`);
}
