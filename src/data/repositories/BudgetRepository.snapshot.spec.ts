import { describe, expect, it } from 'vitest';
import {
  assertValidBudgetDatabaseSnapshot,
  createBudgetDatabaseSnapshot,
} from './BudgetRepository.snapshot';

function createValidData() {
  return {
    budget_years: [],
    budget_months: [],
    budget_allocations: [],
    budget_expenses: [],
    recurring_expense_rules: [],
    expense_categories: [],
  };
}

describe('data/repositories BudgetRepository snapshot', () => {
  it('should create and validate a valid snapshot', () => {
    const snapshot = createBudgetDatabaseSnapshot(createValidData(), '0.0.1');

    expect(snapshot.meta.format).toBe('triada-db-export');
    expect(snapshot.meta.schemaVersion).toBe(1);
    expect(snapshot.meta.appVersion).toBe('0.0.1');

    expect(() => assertValidBudgetDatabaseSnapshot(snapshot)).not.toThrow();
  });

  it('should reject invalid root payload', () => {
    expect(() => assertValidBudgetDatabaseSnapshot(null)).toThrow(
      'Invalid snapshot: root payload must be an object',
    );
  });

  it('should reject missing meta', () => {
    expect(() => assertValidBudgetDatabaseSnapshot({ data: createValidData() })).toThrow(
      'Invalid snapshot: meta is required',
    );
  });

  it('should reject unsupported format', () => {
    expect(() =>
      assertValidBudgetDatabaseSnapshot({
        meta: {
          format: 'other-format',
          schemaVersion: 1,
          exportedAt: '2026-01-01T00:00:00.000Z',
          appVersion: '0.0.1',
        },
        data: createValidData(),
      }),
    ).toThrow('Invalid snapshot: unsupported format other-format');
  });

  it('should reject unsupported schema version', () => {
    expect(() =>
      assertValidBudgetDatabaseSnapshot({
        meta: {
          format: 'triada-db-export',
          schemaVersion: 2,
          exportedAt: '2026-01-01T00:00:00.000Z',
          appVersion: '0.0.1',
        },
        data: createValidData(),
      }),
    ).toThrow('Invalid snapshot: unsupported schema version 2');
  });

  it('should reject invalid exportedAt', () => {
    expect(() =>
      assertValidBudgetDatabaseSnapshot({
        meta: {
          format: 'triada-db-export',
          schemaVersion: 1,
          exportedAt: 'invalid-date',
          appVersion: '0.0.1',
        },
        data: createValidData(),
      }),
    ).toThrow('Invalid snapshot: exportedAt must be an ISO datetime string');
  });

  it('should reject empty appVersion', () => {
    expect(() =>
      assertValidBudgetDatabaseSnapshot({
        meta: {
          format: 'triada-db-export',
          schemaVersion: 1,
          exportedAt: '2026-01-01T00:00:00.000Z',
          appVersion: '',
        },
        data: createValidData(),
      }),
    ).toThrow('Invalid snapshot: appVersion must be a non-empty string');
  });

  it('should reject missing data', () => {
    expect(() =>
      assertValidBudgetDatabaseSnapshot({
        meta: {
          format: 'triada-db-export',
          schemaVersion: 1,
          exportedAt: '2026-01-01T00:00:00.000Z',
          appVersion: '0.0.1',
        },
      }),
    ).toThrow('Invalid snapshot: data is required');
  });

  it('should reject non-array collections and non-object rows', () => {
    expect(() =>
      assertValidBudgetDatabaseSnapshot({
        meta: {
          format: 'triada-db-export',
          schemaVersion: 1,
          exportedAt: '2026-01-01T00:00:00.000Z',
          appVersion: '0.0.1',
        },
        data: {
          budget_years: {},
          budget_months: [],
          budget_allocations: [],
          budget_expenses: [],
          recurring_expense_rules: [],
          expense_categories: [],
        },
      }),
    ).toThrow('Invalid snapshot: data.budget_years must be an array');

    expect(() =>
      assertValidBudgetDatabaseSnapshot({
        meta: {
          format: 'triada-db-export',
          schemaVersion: 1,
          exportedAt: '2026-01-01T00:00:00.000Z',
          appVersion: '0.0.1',
        },
        data: {
          budget_years: [123],
          budget_months: [],
          budget_allocations: [],
          budget_expenses: [],
          recurring_expense_rules: [],
          expense_categories: [],
        },
      }),
    ).toThrow('Invalid snapshot: data.budget_years must contain objects');
  });
});
