import { prisma } from '../../config/database.js';
import { cleanDatabase } from './factories.js';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

export { prisma, cleanDatabase };
