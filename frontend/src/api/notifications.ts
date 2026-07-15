import { api } from './client';

export function getNotifications(page = 1, limit = 20, unreadOnly?: boolean, type?: string) {
  let params = `?page=${page}&limit=${limit}`;
  if (unreadOnly) params += '&unreadOnly=true';
  if (type) params += `&type=${type}`;
  return api.get(`/notifications${params}`);
}

export function getUnreadCount() {
  return api.get('/notifications/unread-count');
}

export function markNotificationRead(id: string) {
  return api.patch(`/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return api.patch('/notifications/read-all');
}

export function deleteNotification(id: string) {
  return api.delete(`/notifications/${id}`);
}
