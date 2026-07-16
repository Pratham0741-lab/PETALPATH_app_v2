import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { metricsService } from '../metrics/metrics.service.js';

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

  async full(req: Request, res: Response, next: NextFunction) {
    let dbConnected = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
    } catch {
      dbConnected = false;
    }

    const metrics = metricsService.getSnapshot();
    const memory = process.memoryUsage();

    const healthData = {
      status: dbConnected ? 'ok' : 'degraded',
      version: '1.0.0',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      database: dbConnected ? 'connected' : 'disconnected',
      memory: {
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        rss: Math.round(memory.rss / 1024 / 1024),
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
      },
      metrics,
    };

    res.status(200).json(healthData);
  }
}

export const healthController = new HealthController();
