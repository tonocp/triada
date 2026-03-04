import { CapacitorSQLite } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

const DB_NAME = 'triada';

let isDbReady = false;
let isInitializing = false;

export async function initDatabase(): Promise<void> {
  if (isDbReady) {
    return;
  }

  if (isInitializing) {
    while (isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return;
  }

  if (!Capacitor.isNativePlatform()) {
    console.error('[DB] SQLite is only available on native platforms (iOS/Android)');
    throw new Error('SQLite is only available on native platforms. Use a device or emulator.');
  }

  isInitializing = true;

  try {
    await CapacitorSQLite.createConnection({
      database: DB_NAME,
    });

    await CapacitorSQLite.open({
      database: DB_NAME,
    });

    await CapacitorSQLite.execute({
      database: DB_NAME,
      statements: `
        CREATE TABLE IF NOT EXISTS budget_years (
          id TEXT PRIMARY KEY,
          monthly_income INTEGER NOT NULL,
          year INTEGER NOT NULL,
          currency TEXT NOT NULL DEFAULT 'USD',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS budget_months (
          id TEXT PRIMARY KEY,
          budget_year_id TEXT NOT NULL,
          month INTEGER NOT NULL,
          year INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (budget_year_id) REFERENCES budget_years(id)
        );

        CREATE TABLE IF NOT EXISTS budget_allocations (
          id TEXT PRIMARY KEY,
          budget_month_id TEXT NOT NULL,
          bucket TEXT NOT NULL,
          allocated INTEGER NOT NULL,
          spent INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (budget_month_id) REFERENCES budget_months(id)
        );
      `,
    });

    console.log('[DB] Database initialized successfully');
    isDbReady = true;
    isInitializing = false;
  } catch (error) {
    console.error('[DB] Failed to initialize database:', error);
    isInitializing = false;
    throw error;
  }
}

export async function execute(statements: string): Promise<unknown> {
  if (!isDbReady) {
    await initDatabase();
  }

  return CapacitorSQLite.execute({
    database: DB_NAME,
    statements,
  });
}

export async function query<T = Record<string, unknown>>(
  statement: string,
  values: (string | number)[] = [],
): Promise<T[]> {
  if (!isDbReady) {
    await initDatabase();
  }

  const result = await CapacitorSQLite.query({
    database: DB_NAME,
    statement,
    values,
  });
  return result.values as T[];
}

export async function run(statement: string, values: (string | number)[] = []): Promise<unknown> {
  if (!isDbReady) {
    await initDatabase();
  }

  return CapacitorSQLite.run({
    database: DB_NAME,
    statement,
    values,
  });
}

export async function closeDatabase(): Promise<void> {
  if (isDbReady) {
    await CapacitorSQLite.closeConnection({ database: DB_NAME });
    isDbReady = false;
  }
}

export function isDatabaseReady(): boolean {
  return isDbReady;
}
