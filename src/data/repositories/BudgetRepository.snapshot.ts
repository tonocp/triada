export const BUDGET_EXPORT_FORMAT = 'triada-db-export';
export const BUDGET_EXPORT_SCHEMA_VERSION = 1;

type SnapshotRow = object;

export interface BudgetDatabaseSnapshotData {
  budget_years: SnapshotRow[];
  budget_months: SnapshotRow[];
  budget_allocations: SnapshotRow[];
  budget_expenses: SnapshotRow[];
  recurring_expense_rules: SnapshotRow[];
  expense_categories: SnapshotRow[];
}

export interface BudgetDatabaseSnapshot {
  meta: {
    format: typeof BUDGET_EXPORT_FORMAT;
    schemaVersion: typeof BUDGET_EXPORT_SCHEMA_VERSION;
    exportedAt: string;
    appVersion: string;
  };
  data: BudgetDatabaseSnapshotData;
}

export function createBudgetDatabaseSnapshot(
  data: BudgetDatabaseSnapshotData,
  appVersion: string,
): BudgetDatabaseSnapshot {
  return {
    meta: {
      format: BUDGET_EXPORT_FORMAT,
      schemaVersion: BUDGET_EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      appVersion,
    },
    data,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertArrayRows(value: unknown, fieldName: string): asserts value is SnapshotRow[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid snapshot: ${fieldName} must be an array`);
  }

  for (const row of value) {
    if (!isObject(row)) {
      throw new Error(`Invalid snapshot: ${fieldName} must contain objects`);
    }
  }
}

export function assertValidBudgetDatabaseSnapshot(
  value: unknown,
): asserts value is BudgetDatabaseSnapshot {
  if (!isObject(value)) {
    throw new Error('Invalid snapshot: root payload must be an object');
  }

  const meta = value.meta;
  const data = value.data;

  if (!isObject(meta)) {
    throw new Error('Invalid snapshot: meta is required');
  }

  if (meta.format !== BUDGET_EXPORT_FORMAT) {
    throw new Error(`Invalid snapshot: unsupported format ${String(meta.format)}`);
  }

  if (meta.schemaVersion !== BUDGET_EXPORT_SCHEMA_VERSION) {
    throw new Error(`Invalid snapshot: unsupported schema version ${String(meta.schemaVersion)}`);
  }

  if (typeof meta.exportedAt !== 'string' || Number.isNaN(Date.parse(meta.exportedAt))) {
    throw new Error('Invalid snapshot: exportedAt must be an ISO datetime string');
  }

  if (typeof meta.appVersion !== 'string' || meta.appVersion.trim().length === 0) {
    throw new Error('Invalid snapshot: appVersion must be a non-empty string');
  }

  if (!isObject(data)) {
    throw new Error('Invalid snapshot: data is required');
  }

  assertArrayRows(data.budget_years, 'data.budget_years');
  assertArrayRows(data.budget_months, 'data.budget_months');
  assertArrayRows(data.budget_allocations, 'data.budget_allocations');
  assertArrayRows(data.budget_expenses, 'data.budget_expenses');
  assertArrayRows(data.recurring_expense_rules, 'data.recurring_expense_rules');
  assertArrayRows(data.expense_categories, 'data.expense_categories');
}
