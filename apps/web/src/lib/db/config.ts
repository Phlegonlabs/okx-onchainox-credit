const LOCAL_DATABASE_URL = 'file:local.db';

export interface DatabaseConfig {
  authToken?: string;
  url: string;
}

export function getDatabaseConfig(): DatabaseConfig {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (!url) {
    return { url: LOCAL_DATABASE_URL };
  }

  if (!authToken) {
    return { url };
  }

  return { url, authToken };
}
