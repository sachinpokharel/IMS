import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { cwd } from 'node:process';

export function getLocalD1Dir() {
  return join(cwd(), '.data', 'hub', 'd1', 'miniflare-D1DatabaseObject');
}

export async function findLatestLocalSqliteFile() {
  const dir = getLocalD1Dir();
  const entries = await readdir(dir);
  const sqliteFiles = entries.filter((f: string) => f.endsWith('.sqlite'));
  if (sqliteFiles.length === 0) return null;

  const withTimes = await Promise.all(
    sqliteFiles.map(async (file: string) => {
      const fullPath = join(dir, file);
      const s = await stat(fullPath);
      return { fullPath, mtimeMs: s.mtimeMs };
    })
  );

  withTimes.sort(
    (a: { mtimeMs: number }, b: { mtimeMs: number }) => b.mtimeMs - a.mtimeMs
  );
  return withTimes[0]!.fullPath;
}


