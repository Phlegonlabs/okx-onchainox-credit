import pino from 'pino';

export const logger = pino({
  name: 'okx-credit',
  level: process.env.LOG_LEVEL ?? 'info',
});
