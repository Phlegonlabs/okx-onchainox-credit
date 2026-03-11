import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { getDatabaseConfig } from './config';
import { schema } from './schema';

function createDatabaseBundle() {
  const runtimeClient = createClient(getDatabaseConfig());

  return {
    client: runtimeClient,
    db: drizzle({ client: runtimeClient, schema }),
  };
}

type DatabaseBundle = ReturnType<typeof createDatabaseBundle>;
type DatabaseClient = DatabaseBundle['client'];
type DatabaseInstance = DatabaseBundle['db'];

let databaseBundle: DatabaseBundle | null = null;

function getDatabaseBundle(): DatabaseBundle {
  if (!databaseBundle) {
    databaseBundle = createDatabaseBundle();
  }

  return databaseBundle;
}

const client = new Proxy({} as DatabaseClient, {
  get(_target, property, receiver) {
    return Reflect.get(getDatabaseBundle().client as object, property, receiver);
  },
});

const db = new Proxy({} as DatabaseInstance, {
  get(_target, property, receiver) {
    return Reflect.get(getDatabaseBundle().db as object, property, receiver);
  },
});

export { client, db, schema };
