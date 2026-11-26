import { Router } from 'express';
import { publicConfigController } from './public-config.controller.js';

const router = Router();

router.get('/public', publicConfigController.get);

export { router as configRoutes };
