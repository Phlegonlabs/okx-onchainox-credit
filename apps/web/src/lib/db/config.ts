const LOCAL_DATABASE_URL = 'file:local.db';

export interface DatabaseConfig {
  authToken?: string;
  url: string;
}

export function getDatabaseConfig(): DatabaseConfig {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  const isProduction = process.env.NODE_ENV === 'production';

  if (!url) {
    if (isProduction) {
      throw new Error('TURSO_DATABASE_URL must be configured in production');
    }

    return { url: LOCAL_DATABASE_URL };
  }

  if (url.startsWith('file:')) {
    return { url };
  }

  if (!authToken) {
    throw new Error('TURSO_AUTH_TOKEN must be configured for remote libSQL databases');
  }

  return { url, authToken };
}
