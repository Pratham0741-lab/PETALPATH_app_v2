import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/database.js';
import { logger } from './utils/logger.js';
import { setupGracefulShutdown } from './utils/shutdown.js';
import { startJobs } from './jobs/index.js';
import { curriculumLoader } from './modules/curriculum/index.js';

const startServer = async () => {
  try {
    logger.info('Validating and loading CBSE curriculum...');
    curriculumLoader.loadAllCurricula();
    logger.info('CBSE curriculum loaded and validated successfully.');

    logger.info('Connecting to database...');
    await prisma.$connect();
    logger.info('Database connected successfully.');

    const listenWithRetry = (port: number | string, retries = 5, delay = 500): Promise<any> => {
      return new Promise((resolve, reject) => {
        const server = app.listen(port, () => {
          logger.info(`Server listening on port ${port} in ${env.NODE_ENV} mode.`);
          resolve(server);
        });

        server.on('error', (err: any) => {
          if (err.code === 'EADDRINUSE' && retries > 0) {
            logger.warn(`Port ${port} in use, retrying in ${delay}ms... (${retries} retries left)`);
            setTimeout(() => {
              try {
                server.close();
              } catch (closeErr) {
                // ignore
              }
              listenWithRetry(port, retries - 1, delay).then(resolve, reject);
            }, delay);
          } else {
            reject(err);
          }
        });
      });
    };

    const server = await listenWithRetry(env.PORT);

    setupGracefulShutdown(server);
    startJobs();
  } catch (error) {
    logger.error(error as Error, 'Startup failed');
    process.exit(1);
  }
};

startServer();
// Trigger reload 8


