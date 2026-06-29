import pino from 'pino';
import { env } from '../config/env.js';
import path from 'path';
import fs from 'fs';

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const streams = [
  { stream: process.stdout },
  { stream: fs.createWriteStream(path.join(logDir, 'app.log'), { flags: 'a' }) },
  { 
    level: 'error' as const, 
    stream: fs.createWriteStream(path.join(logDir, 'error.log'), { flags: 'a' }) 
  }
];

export const logger = pino(
  {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'password',
        'confirmPassword',
        'token',
        'refreshToken',
        'refresh_token',
        'accessToken',
        'access_token',
        'idToken',
        'id_token',
        'googleToken',
        'authorization',
        'req.headers.authorization',
        'req.body.password',
        'req.body.token',
        'req.body.refreshToken',
      ],
      censor: '[REDACTED]',
    },
  },
  pino.multistream(streams)
);
