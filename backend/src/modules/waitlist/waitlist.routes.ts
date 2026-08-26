import { Router } from 'express';
import { waitlistController } from './waitlist.controller.js';

const router = Router();

router.post('/', waitlistController.join as any);

export { router as waitlistRoutes };
