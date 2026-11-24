import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';

const startTime = Date.now();

export class HealthController {
  async liveness(req: Request, res: Response, next: NextFunction) {
    res.status(200).json({
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    });
  }

  async readiness(req: Request, res: Response, next: NextFunction) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({
        status: 'ok',
        database: 'connected',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(503).json({
        status: 'error',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Public, unauthenticated: status only. It used to also return the
   * environment, Node version, pid, platform, memory and request metrics, which
   * tell an attacker about the server and help nobody using the app (the app
   * reads `status` only). Those stay in logs and on the server itself.
   */
  async full(req: Request, res: Response, next: NextFunction) {
    let dbConnected = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
    } catch {
      dbConnected = false;
    }

    res.status(200).json({
      status: dbConnected ? 'ok' : 'degraded',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      database: dbConnected ? 'connected' : 'disconnected',
    });
  }
}

export const healthController = new HealthController();
