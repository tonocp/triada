import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

const DB_NAME = 'triada';
const DB_VERSION = 1;

const sqlite = new SQLiteConnection(CapacitorSQLite);

let dbConnection: SQLiteDBConnection | null = null;
let isDbReady = false;
let isInitializing = false;

function isNativeRuntime(): boolean {
  const platform = Capacitor.getPlatform();
  return platform === 'ios' || platform === 'android';
}

async function getConnection(): Promise<SQLiteDBConnection> {
  if (dbConnection) {
    return dbConnection;
  }

  const consistency = await sqlite.checkConnectionsConsistency().catch(() => ({ result: false }));
  const isConnection = await sqlite.isConnection(DB_NAME, false);

  if (consistency.result && isConnection.result) {
    dbConnection = await sqlite.retrieveConnection(DB_NAME, false);
  } else {
    dbConnection = await sqlite.createConnection(
      DB_NAME,
      false,
      'no-encryption',
      DB_VERSION,
      false,
    );
  }

  const dbOpen = await dbConnection.isDBOpen();
  if (!dbOpen.result) {
    await dbConnection.open();
  }

  return dbConnection;
}

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

  if (!isNativeRuntime()) {
    throw new Error('SQLite is only available on native platforms. Use a device or emulator.');
  }

  isInitializing = true;

  try {
    const db = await getConnection();

    // noinspection SqlNoDataSourceInspection
    await db.execute(
      `
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
          monthly_income INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (budget_year_id) REFERENCES budget_years(id)
        );

        CREATE TABLE IF NOT EXISTS budget_allocations (
          id TEXT PRIMARY KEY,
          budget_month_id TEXT NOT NULL,
          group TEXT NOT NULL,
          allocated INTEGER NOT NULL,
          spent INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (budget_month_id) REFERENCES budget_months(id)
        );

        CREATE TABLE IF NOT EXISTS budget_expenses (
          id TEXT PRIMARY KEY,
          budget_month_id TEXT NOT NULL,
          group TEXT NOT NULL,
          category_id TEXT NOT NULL,
          amount INTEGER NOT NULL,
          description TEXT NOT NULL,
          recurring_rule_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (budget_month_id) REFERENCES budget_months(id)
        );

        CREATE TABLE IF NOT EXISTS recurring_expense_rules (
          id TEXT PRIMARY KEY,
          budget_year_id TEXT NOT NULL,
          group TEXT NOT NULL,
          category_id TEXT NOT NULL,
          amount INTEGER NOT NULL,
          description TEXT NOT NULL,
          start_year INTEGER NOT NULL,
          start_month INTEGER NOT NULL,
          end_year INTEGER,
          end_month INTEGER,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (budget_year_id) REFERENCES budget_years(id)
        );

        CREATE TABLE IF NOT EXISTS expense_categories (
          id TEXT PRIMARY KEY,
          group_name TEXT NOT NULL,
          order_index INTEGER NOT NULL,
          name TEXT,
          is_default INTEGER NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          deleted_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `,
      false,
    );

    try {
      // noinspection SqlNoDataSourceInspection
      await db.execute(
        `ALTER TABLE budget_months ADD COLUMN monthly_income INTEGER NOT NULL DEFAULT 0;`,
        false,
      );
    } catch {
      // ignore if column already exists
    }

    try {
      // noinspection SqlNoDataSourceInspection
      await db.execute(`ALTER TABLE budget_expenses ADD COLUMN recurring_rule_id TEXT;`, false);
    } catch {
      // ignore if column already exists
    }

    try {
      // noinspection SqlNoDataSourceInspection
      await db.execute(
        `ALTER TABLE budget_expenses ADD COLUMN category_id TEXT NOT NULL DEFAULT 'housing';`,
        false,
      );
    } catch {
      // ignore if column already exists
    }

    try {
      // noinspection SqlNoDataSourceInspection
      await db.execute(
        `ALTER TABLE recurring_expense_rules ADD COLUMN category_id TEXT NOT NULL DEFAULT 'housing';`,
        false,
      );
    } catch {
      // ignore if column already exists
    }

    try {
      // noinspection SqlNoDataSourceInspection
      await db.execute(`ALTER TABLE expense_categories ADD COLUMN name TEXT;`, false);
    } catch {
      // ignore if column already exists
    }

    try {
      // noinspection SqlNoDataSourceInspection
      await db.execute(
        `ALTER TABLE expense_categories ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;`,
        false,
      );
    } catch {
      // ignore if column already exists
    }

    try {
      // noinspection SqlNoDataSourceInspection
      await db.execute(`ALTER TABLE expense_categories ADD COLUMN deleted_at TEXT;`, false);
    } catch {
      // ignore if column already exists
    }

    isDbReady = true;
  } finally {
    isInitializing = false;
  }
}

export async function execute(statements: string): Promise<unknown> {
  if (!isDbReady) {
    await initDatabase();
  }

  const db = await getConnection();
  return db.execute(statements, false);
}

export async function query<T = Record<string, unknown>>(
  statement: string,
  values: (string | number | null)[] = [],
): Promise<T[]> {
  if (!isDbReady) {
    await initDatabase();
  }

  const db = await getConnection();
  const result = await db.query(statement, values);
  return (result.values ?? []) as T[];
}

export async function run(
  statement: string,
  values: (string | number | null)[] = [],
): Promise<unknown> {
  if (!isDbReady) {
    await initDatabase();
  }

  const db = await getConnection();
  return db.run(statement, values, false);
}

export async function closeDatabase(): Promise<void> {
  if (!dbConnection) {
    isDbReady = false;
    return;
  }

  try {
    await dbConnection.close();
  } catch {
    // ignore close errors, we'll still try to clear connection references
  }

  try {
    await sqlite.closeConnection(DB_NAME, false);
  } catch {
    // ignore close connection errors
  }

  dbConnection = null;
  isDbReady = false;
}

export function isDatabaseReady(): boolean {
  return isDbReady;
}
