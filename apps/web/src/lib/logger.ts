import pino from 'pino';

export const logger = pino({
  name: 'graxis',
  level: process.env.LOG_LEVEL ?? 'info',
});
