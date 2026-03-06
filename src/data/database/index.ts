import { Capacitor } from '@capacitor/core';
import {
  closeDatabase as closeSqlite,
  initDatabase as initSqlite,
  isDatabaseReady as isSqliteReady,
} from './database';
import {
  closeDatabase as closeIndexedDb,
  initDatabase as initIndexedDb,
  isDatabaseReady as isIndexedDbReady,
} from './indexeddb';

export * from './utils';

function isNativeRuntime(): boolean {
  const platform = Capacitor.getPlatform();
  return platform === 'ios' || platform === 'android';
}

export async function initDatabase(): Promise<void> {
  if (isNativeRuntime()) {
    await initSqlite();
    return;
  }

  await initIndexedDb();
}

export async function closeDatabase(): Promise<void> {
  if (isNativeRuntime()) {
    await closeSqlite();
    return;
  }

  await closeIndexedDb();
}

export function isDatabaseReady(): boolean {
  return isNativeRuntime() ? isSqliteReady() : isIndexedDbReady();
}
