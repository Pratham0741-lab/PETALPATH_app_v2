const { execSync } = require('child_process');
const path = require('path');

const TEST_DB_URL = 'postgresql://postgres:pratham@localhost:5432/petalpath_test?schema=public';

process.env.DATABASE_URL = TEST_DB_URL;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-min-16-char';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-key';
process.env.ACCESS_TOKEN_EXPIRY = '15m';
process.env.REFRESH_TOKEN_EXPIRY = '7d';
process.env.CORS_ORIGINS = 'http://localhost:8081';
process.env.CDN_BASE_URL = 'https://test-cdn.example.com';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';

try {
  const migrationDir = path.join(__dirname, '..', '..', '..', 'prisma', 'migrations');
  execSync(`npx prisma migrate deploy --schema=${path.join(__dirname, '..', '..', '..', 'prisma', 'schema.prisma')}`, {
    cwd: path.join(__dirname, '..', '..', '..'),
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    timeout: 60000,
  });
  console.log('Test database migrations applied successfully.');
} catch (err) {
  console.error('Failed to apply test database migrations:', err.message);
  process.exit(1);
}
