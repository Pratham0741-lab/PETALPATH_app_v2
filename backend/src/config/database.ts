import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

prisma.$use(async (params, next) => {
  if (params.model === 'LessonProgress' && ['create', 'update', 'upsert', 'updateMany'].includes(params.action)) {
    console.log(`\n=== [DATABASE WRITE] LessonProgress ${params.action} ===`);
    console.log('Arguments:', JSON.stringify(params.args, null, 2));
    console.log('============================================\n');
  }
  return next(params);
});
