import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { getDatabaseConfig } from './config';
import { schema } from './schema';

const databaseConfig = getDatabaseConfig();
const client = createClient(databaseConfig);
const db = drizzle({ client, schema });

export { client, db, schema };
