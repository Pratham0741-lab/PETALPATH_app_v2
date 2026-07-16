import { prisma } from '../../config/database.js';
import { cleanDatabase } from '../helpers/factories.js';
import '../helpers/setup.js';
import request from 'supertest';
import app from '../../app.js';

describe('Operations - Health Endpoints', () => {
  it('GET /health/live returns ok status', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET /health/ready returns ok with database connected', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
  });

  it('GET /health returns full health data', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('environment');
    expect(res.body).toHaveProperty('database');
    expect(res.body).toHaveProperty('memory');
    expect(res.body).toHaveProperty('process');
    expect(res.body).toHaveProperty('metrics');
  });
});

describe('Operations - Request ID Middleware', () => {
  it('adds X-Request-Id header to responses', async () => {
    const res = await request(app).get('/health/live');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('uses provided X-Request-Id header from client', async () => {
    const res = await request(app)
      .get('/health/live')
      .set('X-Request-Id', 'test-request-id-123');
    expect(res.headers['x-request-id']).toBe('test-request-id-123');
  });
});

describe('Operations - Metrics Service', () => {
  it('tracks request count', async () => {
    const metricsService = (await import('../../modules/metrics/metrics.service.js')).metricsService;
    const before = metricsService.getSnapshot().totalRequests;
    await request(app).get('/health/live');
    const after = metricsService.getSnapshot().totalRequests;
    expect(after).toBeGreaterThanOrEqual(before + 1);
  });

  it('reports error rate', async () => {
    const metricsService = (await import('../../modules/metrics/metrics.service.js')).metricsService;
    await request(app).get('/api/non-existent-route');
    const snapshot = metricsService.getSnapshot();
    expect(snapshot.totalErrors).toBeGreaterThanOrEqual(1);
  });
});

describe('Operations - Error Middleware', () => {
  it('returns requestId in 404 responses', async () => {
    const res = await request(app).get('/api/non-existent-route');
    expect(res.status).toBe(404);
    expect(res.body.requestId).toBeDefined();
    expect(res.body.success).toBe(false);
  });

  it('returns requestId in 401 responses', async () => {
    const res = await request(app).get('/api/children');
    expect(res.status).toBe(401);
    expect(res.body.requestId).toBeDefined();
  });
});

describe('Operations - Rate Limiting', () => {
  it('health endpoints are not rate limited', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
  });
});

describe('Operations - Graceful Shutdown Utilities', () => {
  it('exports setupGracefulShutdown function', async () => {
    const { setupGracefulShutdown } = await import('../../utils/shutdown.js');
    expect(typeof setupGracefulShutdown).toBe('function');
  });
});

describe('Operations - Audit Service', () => {
  it('exports auditLog function', async () => {
    const { auditLog } = await import('../../services/audit.service.js');
    expect(typeof auditLog).toBe('function');
  });
});

describe('Operations - Production Config', () => {
  it('has all required config sections', async () => {
    const { productionConfig } = await import('../../config/production.js');
    expect(productionConfig.pagination).toBeDefined();
    expect(productionConfig.pagination.defaultLimit).toBe(20);
    expect(productionConfig.pagination.maxLimit).toBe(200);
    expect(productionConfig.jobs).toBeDefined();
    expect(productionConfig.jobs.cleanupIntervalMs).toBeGreaterThan(0);
  });
});
