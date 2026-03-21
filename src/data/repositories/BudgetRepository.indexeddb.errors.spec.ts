import { beforeEach, describe, expect, it, vi } from 'vitest';

const getIndexedDbMock = vi.fn();
const initDatabaseMock = vi.fn();
const generateUUIDMock = vi.fn();
const getCurrentTimestampMock = vi.fn();

function createFailingDb(mode: 'error' | 'abort'): IDBDatabase {
  const tx: {
    oncomplete: ((ev: Event) => unknown) | null;
    onerror: ((ev: Event) => unknown) | null;
    onabort: ((ev: Event) => unknown) | null;
    error: Error;
    objectStore: ReturnType<typeof vi.fn>;
  } = {
    oncomplete: null,
    onerror: null,
    onabort: null,
    error: mode === 'error' ? new Error('tx failed') : new Error('tx aborted'),
    objectStore: vi.fn().mockReturnValue({
      put: vi.fn().mockImplementation(() => {
        queueMicrotask(() => {
          if (mode === 'error') {
            tx.onerror?.(new Event('error'));
            return;
          }

          tx.onabort?.(new Event('abort'));
        });
      }),
    }),
  };

  return {
    transaction: vi.fn().mockReturnValue(tx),
  } as unknown as IDBDatabase;
}

describe('data/repositories IndexedDB transaction failures', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    generateUUIDMock.mockReturnValue('id-1');
    getCurrentTimestampMock.mockReturnValue('2026-01-01T00:00:00.000Z');

    vi.doMock('@/data/database/indexeddb', () => ({
      getIndexedDb: getIndexedDbMock,
      initDatabase: initDatabaseMock,
      indexedDbStores: {
        budgetYears: 'budget_years',
        budgetMonths: 'budget_months',
        budgetAllocations: 'budget_allocations',
        budgetExpenses: 'budget_expenses',
        recurringExpenseRules: 'recurring_expense_rules',
      },
      indexedDbIndexes: {
        budgetMonthByYearMonth: 'by_budget_year_month',
        allocationsByMonth: 'by_budget_month',
        expensesByMonthGroup: 'by_budget_month_group',
        expensesByRule: 'by_recurring_rule_id',
      },
    }));

    vi.doMock('@/data/database/utils', () => ({
      generateUUID: generateUUIDMock,
      getCurrentTimestamp: getCurrentTimestampMock,
    }));
  });

  it('should reject writes when transaction errors', async () => {
    getIndexedDbMock.mockResolvedValue(createFailingDb('error'));
    const { indexedDbBudgetRepository } = await import('./BudgetRepository.indexeddb');

    await expect(
      indexedDbBudgetRepository.createBudgetYear({
        monthlyIncome: 100_000,
        year: 2026,
        currency: 'USD',
      }),
    ).rejects.toThrow('tx failed');
  });

  it('should reject writes when transaction aborts', async () => {
    getIndexedDbMock.mockResolvedValue(createFailingDb('abort'));
    const { indexedDbBudgetRepository } = await import('./BudgetRepository.indexeddb');

    await expect(
      indexedDbBudgetRepository.createBudgetMonth({
        budgetYearId: 'year-1',
        month: 1,
        year: 2026,
        monthlyIncome: 100_000,
      }),
    ).rejects.toThrow('tx aborted');
  });
});
