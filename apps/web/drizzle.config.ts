import { defineConfig } from 'drizzle-kit';
import { getDatabaseConfig } from './src/lib/db/config';

const databaseConfig = getDatabaseConfig();

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: databaseConfig,
  verbose: true,
  strict: false,
});
