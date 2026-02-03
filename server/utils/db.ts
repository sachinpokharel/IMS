import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../database/schema';
import { ensureMigrations } from './migrate';

export const tables = schema;

export function useDB() {
  const db = hubDatabase();

  // In local dev, auto-create tables once so first run doesn't crash with
  // "no such table: ...".
  if (import.meta.dev) {
    // Fire-and-forget; requests will naturally fail if schema is truly broken.
    void ensureMigrations(db);
  }

  return drizzle(db, { schema });
}

export const useDrizzle = useDB;
