import sqlite3 from 'sqlite3';

type DbResult = {
  lastID: number;
  changes: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __plannerDb: sqlite3.Database | undefined;
}

// Cached on globalThis so `next dev`'s Fast Refresh doesn't re-run this
// module's top level and open a second connection to the same file.
const db = globalThis.__plannerDb ?? new sqlite3.Database('./planner.db');
globalThis.__plannerDb = db;

export const dbGet = <T>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
};

export const dbAll = <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
};

export const dbRun = (sql: string, params: any[] = []): Promise<DbResult> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

export function closeDatabase() {
  return new Promise<void>((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Database connection closed');
        resolve();
      }
    });
  });
}
