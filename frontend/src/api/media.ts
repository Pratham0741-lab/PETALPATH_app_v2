/**
 * Media API
 *
 * Consolidated module for video, audio, listen, speak, and write
 * progress endpoints.
 */

import { api } from './client';

// ── Video ──────────────────────────────────────────────

export function getVideos(activityId: string) {
  return api.get(`/videos?activityId=${activityId}`);
}

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

export function getAudio(activityId: string) {
  return api.get(`/audio?activityId=${activityId}`);
}

export function getAllAudio() {
  return api.get('/audio');
}

export function getListenProgress(activityId: string) {
  return api.get(`/listen-progress/${activityId}`);
}

export function completeListenProgress(data: {
  activityId: string;
  childId: string;
  [key: string]: any;
}) {
  return api.post('/listen-progress/complete', data);
}

// ── Speak ──────────────────────────────────────────────

export function getSpeakProgress(activityId: string) {
  return api.get(`/speak-progress/${activityId}`);
}

export function completeSpeakProgress(data: {
  activityId: string;
  childId: string;
  [key: string]: any;
}) {
  return api.post('/speak-progress/complete', data);
}

// ── Write ──────────────────────────────────────────────

export function getWriteProgress(activityId: string) {
  return api.get(`/write-progress/${activityId}`);
}

export function completeWriteProgress(data: {
  activityId: string;
  childId: string;
  [key: string]: any;
}) {
  return api.post('/write-progress/complete', data);
}
