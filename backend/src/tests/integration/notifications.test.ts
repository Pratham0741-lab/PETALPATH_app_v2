import '../helpers/setup.js';
import app from '../../app.js';
import { prisma } from '../../config/database.js';
import supertest from 'supertest';
import { createTestUser, cleanDatabase } from '../helpers/factories.js';
import { getAuthToken } from '../helpers/auth.js';
import { NotificationType, NotificationPriority } from '@prisma/client';

const request = supertest(app);

describe('Notifications Integration', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  const createUserWithToken = async (role = 'PARENT') => {
    const user = await createTestUser({ role });
    return { user, token: getAuthToken(user.id, role) };
  };

  const createNotificationFixture = async (userId: string, overrides: Partial<{
    title: string;
    message: string;
    type: NotificationType;
    isRead: boolean;
    childId: string | null;
  }> = {}) => {
    return prisma.notification.create({
      data: {
        userId,
        title: overrides.title ?? 'Test Notification',
        message: overrides.message ?? 'Test message body',
        type: overrides.type ?? NotificationType.SYSTEM,
        priority: NotificationPriority.NORMAL,
        isRead: overrides.isRead ?? false,
        ...(overrides.childId !== undefined ? { childId: overrides.childId } : {}),
      },
    });
  };

  describe('POST /api/notifications (admin only)', () => {
    it('should return 403 for non-admin parents', async () => {
      const { token } = await createUserWithToken('PARENT');
      const { user: target } = await createUserWithToken('PARENT');

      const res = await request
        .post('/api/notifications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: target.id,
          title: 'Hi',
          message: 'There',
          type: 'SYSTEM',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should create a notification for admin and return 201', async () => {
      const { token } = await createUserWithToken('ADMIN');
      const { user: target } = await createUserWithToken('PARENT');

      const res = await request
        .post('/api/notifications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: target.id,
          title: 'Welcome',
          message: 'Thanks for joining',
          type: 'SYSTEM',
          priority: 'HIGH',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Welcome');
      expect(res.body.data.isRead).toBe(false);
      expect(res.body.data.userId).toBe(target.id);
    });

    it('should return 400 for invalid payload', async () => {
      const { token } = await createUserWithToken('ADMIN');

      const res = await request
        .post('/api/notifications')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 without token', async () => {
      const res = await request.post('/api/notifications').send({
        userId: '00000000-0000-0000-0000-000000000000',
        title: 'Hi',
        message: 'There',
        type: 'SYSTEM',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/notifications', () => {
    it('should list only the authenticated user notifications', async () => {
      const { user, token } = await createUserWithToken('PARENT');
      const other = await createUserWithToken('PARENT');
      await createNotificationFixture(user.id);
      await createNotificationFixture(user.id);
      await createNotificationFixture(other.user.id);

      const res = await request
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('should filter by unreadOnly', async () => {
      const { user, token } = await createUserWithToken('PARENT');
      await createNotificationFixture(user.id, { isRead: false });
      await createNotificationFixture(user.id, { isRead: true });

      const res = await request
        .get('/api/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].isRead).toBe(false);
    });

    it('should filter by type', async () => {
      const { user, token } = await createUserWithToken('PARENT');
      await createNotificationFixture(user.id, { type: NotificationType.REWARD });
      await createNotificationFixture(user.id, { type: NotificationType.SECURITY });

      const res = await request
        .get(`/api/notifications?type=${NotificationType.REWARD}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].type).toBe(NotificationType.REWARD);
    });

    it('should paginate results', async () => {
      const { user, token } = await createUserWithToken('PARENT');
      await createNotificationFixture(user.id);
      await createNotificationFixture(user.id);
      await createNotificationFixture(user.id);

      const res = await request
        .get('/api/notifications?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.totalPages).toBe(2);
    });

    it('should return 401 without token', async () => {
      const res = await request.get('/api/notifications');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should return the unread count', async () => {
      const { user, token } = await createUserWithToken('PARENT');
      await createNotificationFixture(user.id, { isRead: false });
      await createNotificationFixture(user.id, { isRead: false });
      await createNotificationFixture(user.id, { isRead: true });

      const res = await request
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unreadCount).toBe(2);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      const { user, token } = await createUserWithToken('PARENT');
      const notification = await createNotificationFixture(user.id, { isRead: false });

      const res = await request
        .patch(`/api/notifications/${notification.id}/read`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isRead).toBe(true);
      expect(res.body.data.readAt).not.toBeNull();
    });

    it('should return 404 for unknown notification', async () => {
      const { token } = await createUserWithToken('PARENT');
      const res = await request
        .patch(`/api/notifications/${'00000000-0000-0000-0000-000000000000'}/read`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when marking another user notification as read', async () => {
      const { token } = await createUserWithToken('PARENT');
      const other = await createUserWithToken('PARENT');
      const notification = await createNotificationFixture(other.user.id);

      const res = await request
        .patch(`/api/notifications/${notification.id}/read`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/notifications/read-all', () => {
    it('should mark all of the user notifications as read', async () => {
      const { user, token } = await createUserWithToken('PARENT');
      await createNotificationFixture(user.id, { isRead: false });
      await createNotificationFixture(user.id, { isRead: false });

      const res = await request
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.updated).toBe(2);

      const countRes = await request
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`);
      expect(countRes.body.data.unreadCount).toBe(0);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete a notification', async () => {
      const { user, token } = await createUserWithToken('PARENT');
      const notification = await createNotificationFixture(user.id);

      const res = await request
        .delete(`/api/notifications/${notification.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(notification.id);

      const after = await prisma.notification.findUnique({ where: { id: notification.id } });
      expect(after).toBeNull();
    });

    it('should return 404 for unknown notification', async () => {
      const { token } = await createUserWithToken('PARENT');
      const res = await request
        .delete(`/api/notifications/${'00000000-0000-0000-0000-000000000000'}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when deleting another user notification', async () => {
      const { token } = await createUserWithToken('PARENT');
      const other = await createUserWithToken('PARENT');
      const notification = await createNotificationFixture(other.user.id);

      const res = await request
        .delete(`/api/notifications/${notification.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
