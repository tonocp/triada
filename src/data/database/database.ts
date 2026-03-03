import { CapacitorSQLite } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

const DB_NAME = 'triada';

let isDbReady = false;
let isInitializing = false;
let useLocalStorage = false;

const isWeb = () => Capacitor.getPlatform() === 'web';

// Simple in-memory DB using localStorage for web
class LocalStorageDB {
  private prefix = 'triada_';

  async createTable(name: string): Promise<void> {
    const key = this.prefix + name;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify([]));
    }
  }

  async insert(table: string, values: Record<string, unknown>): Promise<void> {
    const key = this.prefix + table;
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    data.push(values);
    localStorage.setItem(key, JSON.stringify(data));
  }

  async select(
    table: string,
    conditions?: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    const key = this.prefix + table;
    let data = JSON.parse(localStorage.getItem(key) || '[]');

    if (conditions) {
      data = data.filter((row: Record<string, unknown>) => {
        for (const [col, val] of Object.entries(conditions)) {
          if (row[col] !== val) return false;
        }
        return true;
      });
    }

    return data;
  }

  async run(sql: string, values: (string | number)[] = []): Promise<void> {
    if (sql.includes('INSERT INTO')) {
      const tableMatch = sql.match(/INSERT INTO (\w+)/);
      const table = tableMatch?.[1];
      if (table) {
        const colsMatch = sql.match(/\(([^)]+)\)\s*VALUES/);
        const cols = colsMatch?.[1]?.split(',').map((c) => c.trim());
        if (cols && values.length === cols.length) {
          const row: Record<string, unknown> = {};
          cols.forEach((col, i) => {
            row[col] = values[i];
          });
          await this.insert(table, row);
        }
      }
    }
  }
}

const localStorageDB = new LocalStorageDB();

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

  isInitializing = true;

  try {
    if (isWeb()) {
      useLocalStorage = true;
    }

    if (useLocalStorage) {
      await localStorageDB.createTable('budget_years');
      await localStorageDB.createTable('budget_months');
      await localStorageDB.createTable('budget_allocations');
      isDbReady = true;
      isInitializing = false;
      return;
    }

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

    isDbReady = true;
    isInitializing = false;
  } catch (error) {
    console.error('[DB] Failed to initialize database:', error);
    if (isWeb()) {
      useLocalStorage = true;
      await localStorageDB.createTable('budget_years');
      await localStorageDB.createTable('budget_months');
      await localStorageDB.createTable('budget_allocations');
      isDbReady = true;
      isInitializing = false;
      return;
    }
    isInitializing = false;
    throw error;
  }
}

export async function execute(statements: string): Promise<unknown> {
  if (!isDbReady) {
    await initDatabase();
  }

  if (useLocalStorage) {
    await localStorageDB.run(statements);
    return { changes: { changes: 1 } };
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

  if (useLocalStorage) {
    const tableMatch = statement.match(/FROM (\w+)/);
    const table = tableMatch?.[1];
    const whereMatch = statement.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);

    let conditions: Record<string, unknown> | undefined;

    if (whereMatch && values.length > 0) {
      const whereClause = whereMatch[1];
      if (whereClause) {
        const whereParts = whereClause.split(/\s+AND\s+/i);
        conditions = {};

        whereParts.forEach((part, idx) => {
          const colMatch = part.trim().match(/(\w+)\s*=\s*\?/);
          const colName = colMatch?.[1];
          if (colName && idx < values.length) {
            conditions![colName] = values[idx];
          }
        });
      }
    }

    if (table) {
      const result = await localStorageDB.select(table, conditions);
      return result as T[];
    }
    return [] as T[];
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

  if (useLocalStorage) {
    await localStorageDB.run(statement, values);
    return { changes: { changes: 1 } };
  }

  return await CapacitorSQLite.run({
    database: DB_NAME,
    statement,
    values,
  });
}

export async function closeDatabase(): Promise<void> {
  if (isDbReady && !useLocalStorage) {
    await CapacitorSQLite.closeConnection({ database: DB_NAME });
    isDbReady = false;
  }
}

export function isDatabaseReady(): boolean {
  return isDbReady;
}
