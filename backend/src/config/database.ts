import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';


export const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

prisma.$use(async (params, next) => {
  if (params.model === 'LessonProgress' && ['create', 'update', 'upsert', 'updateMany'].includes(params.action)) {
    logger.debug({ model: 'LessonProgress', action: params.action }, 'database write');
  }
  return next(params);
});
