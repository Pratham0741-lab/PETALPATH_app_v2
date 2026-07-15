import { Router } from 'express';
import { notificationsController } from './notifications.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware as any);

// Static routes must be declared before the `/:id` parameter route.
router.get('/', notificationsController.list as any);
router.get('/unread-count', notificationsController.unreadCount as any);
router.post('/', notificationsController.create as any);
router.patch('/read-all', notificationsController.markAllRead as any);
router.patch('/:id/read', notificationsController.markRead as any);
router.delete('/:id', notificationsController.delete as any);

export { router as notificationsRoutes };
