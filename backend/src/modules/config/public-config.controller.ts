import type { Request, Response } from 'express';
import { publicConfigService } from './public-config.service.js';

export const publicConfigController = {
  get(_req: Request, res: Response): void {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ success: true, data: publicConfigService.get() });
  },
};
