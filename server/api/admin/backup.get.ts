import { readFile } from 'node:fs/promises';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { findLatestLocalSqliteFile } from '../../utils/localD1';

const gzipAsync = promisify(gzip);

export default defineEventHandler(async (event) => {
  // Local dev-only (NuxtHub local D1 uses a SQLite file on disk).
  if (!import.meta.dev) {
    throw createError({
      statusCode: 501,
      message:
        'Database file backup is only available in local development. Use Cloudflare D1 exports/backups in production.',
    });
  }

  const sqlitePath = await findLatestLocalSqliteFile();
  if (!sqlitePath) {
    throw createError({
      statusCode: 404,
      message: 'No local D1 SQLite database file found to back up.',
    });
  }

  const raw = await readFile(sqlitePath);
  const compressed = await gzipAsync(raw, { level: 9 });

  const stamp = new Date()
    .toISOString()
    .replace('T', '_')
    .replace(/\..+$/, '')
    .replace(/:/g, '-');

  setHeader(event, 'content-type', 'application/gzip');
  setHeader(
    event,
    'content-disposition',
    `attachment; filename="openstock-db_${stamp}.sqlite.gz"`
  );
  setHeader(event, 'cache-control', 'no-store');

  return compressed;
});


