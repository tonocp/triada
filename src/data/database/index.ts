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

export async function initDatabase(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await initSqlite();
    return;
  }

  await initIndexedDb();
}

export async function closeDatabase(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await closeSqlite();
    return;
  }

  await closeIndexedDb();
}

export function isDatabaseReady(): boolean {
  return Capacitor.isNativePlatform() ? isSqliteReady() : isIndexedDbReady();
}
