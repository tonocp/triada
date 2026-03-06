import { query, run } from '@/data/database/database';
import { generateUUID, getCurrentTimestamp } from '@/data/database/utils';
import type {
  BudgetAllocation,
  BudgetMonth,
  BudgetYear,
  CreateBudgetAllocationInput,
  CreateBudgetMonthInput,
  CreateBudgetYearInput,
} from '@/domain/entities';
import {
  BUCKET_ORDER,
  BUCKET_PERCENTAGES,
  compareBuckets,
  type BucketType,
} from '@/domain/entities';
import type { SupportedCurrency } from '@/shared/composables/useCurrency';
import type { BudgetRepository } from './BudgetRepository.types';

export const sqliteBudgetRepository: BudgetRepository = {
  async createBudgetYear(input: CreateBudgetYearInput): Promise<BudgetYear> {
    const id = generateUUID();
    const now = getCurrentTimestamp();

    // noinspection SqlNoDataSourceInspection
    await run(
      `INSERT INTO budget_years (id, monthly_income, year, currency, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.monthlyIncome, input.year, input.currency, now, now],
    );

    return {
      id,
      monthlyIncome: input.monthlyIncome,
      year: input.year,
      currency: input.currency,
      createdAt: now,
      updatedAt: now,
    };
  },

  async getLatestBudgetYear(): Promise<BudgetYear | null> {
    // noinspection SqlNoDataSourceInspection
    const result = await query<{
      id: string;
      monthly_income: number;
      year: number;
      currency: string;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT * FROM budget_years
       WHERE EXISTS (
         SELECT 1 FROM budget_months
         WHERE budget_months.budget_year_id = budget_years.id
       )
       ORDER BY year DESC, created_at DESC
       LIMIT 1`,
      [],
    );

    if (result.length === 0) return null;

    const [row] = result;
    if (!row) return null;

    return {
      id: row.id,
      monthlyIncome: Number(row.monthly_income),
      year: Number(row.year),
      currency: row.currency as SupportedCurrency,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  async getBudgetYearByYear(year: number): Promise<BudgetYear | null> {
    // noinspection SqlNoDataSourceInspection
    const result = await query<{
      id: string;
      monthly_income: number;
      year: number;
      currency: string;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT * FROM budget_years
       WHERE year = ?
         AND EXISTS (
           SELECT 1 FROM budget_months
           WHERE budget_months.budget_year_id = budget_years.id
         )
       ORDER BY created_at DESC
       LIMIT 1`,
      [year],
    );

    if (result.length === 0) return null;

    const [row] = result;
    if (!row) return null;

    return {
      id: row.id,
      monthlyIncome: Number(row.monthly_income),
      year: Number(row.year),
      currency: row.currency as SupportedCurrency,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  async createBudgetMonth(input: CreateBudgetMonthInput): Promise<BudgetMonth> {
    const id = generateUUID();
    const now = getCurrentTimestamp();

    // noinspection SqlNoDataSourceInspection
    await run(
      `INSERT INTO budget_months (id, budget_year_id, month, year, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.budgetYearId, input.month, input.year, now, now],
    );

    return {
      id,
      budgetYearId: input.budgetYearId,
      month: input.month,
      year: input.year,
      allocations: [],
      createdAt: now,
      updatedAt: now,
    };
  },

  async getBudgetMonth(budgetYearId: string, month: number): Promise<BudgetMonth | null> {
    // noinspection SqlNoDataSourceInspection
    const result = await query<{
      id: string;
      budget_year_id: string;
      month: number;
      year: number;
      created_at: string;
      updated_at: string;
    }>(`SELECT * FROM budget_months WHERE budget_year_id = ? AND month = ?`, [budgetYearId, month]);

    if (result.length === 0) return null;

    const [row] = result;
    if (!row) return null;

    const allocations = await sqliteBudgetRepository.getAllocationsByMonth(row.id);

    return {
      id: row.id,
      budgetYearId: row.budget_year_id,
      month: Number(row.month),
      year: Number(row.year),
      allocations,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  async createBudgetAllocation(input: CreateBudgetAllocationInput): Promise<BudgetAllocation> {
    const id = generateUUID();
    const now = getCurrentTimestamp();

    // noinspection SqlNoDataSourceInspection
    await run(
      `INSERT INTO budget_allocations (id, budget_month_id, bucket, allocated, spent, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.budgetMonthId, input.bucket, input.allocated, 0, now, now],
    );

    return {
      id,
      budgetMonthId: input.budgetMonthId,
      bucket: input.bucket,
      allocated: input.allocated,
      spent: 0,
      createdAt: now,
      updatedAt: now,
    };
  },

  async getAllocationsByMonth(budgetMonthId: string): Promise<BudgetAllocation[]> {
    // noinspection SqlNoDataSourceInspection
    const result = await query<{
      id: string;
      budget_month_id: string;
      bucket: string;
      allocated: number;
      spent: number;
      created_at: string;
      updated_at: string;
    }>(`SELECT * FROM budget_allocations WHERE budget_month_id = ?`, [budgetMonthId]);

    return result
      .map((row) => ({
        id: row.id,
        budgetMonthId: row.budget_month_id,
        bucket: row.bucket as BucketType,
        allocated: Number(row.allocated),
        spent: Number(row.spent),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
      .sort((left, right) => compareBuckets(left.bucket, right.bucket));
  },

  async createYearWithAllocations(
    monthlyIncome: number,
    year: number,
    currency: SupportedCurrency,
  ): Promise<{ budgetYear: BudgetYear; months: BudgetMonth[] }> {
    const budgetYear = await sqliteBudgetRepository.createBudgetYear({
      monthlyIncome,
      year,
      currency,
    });
    const months: BudgetMonth[] = [];

    for (let month = 1; month <= 12; month++) {
      const budgetMonth = await sqliteBudgetRepository.createBudgetMonth({
        budgetYearId: budgetYear.id,
        month,
        year,
      });

      const allocations: BudgetAllocation[] = [];

      for (const bucket of BUCKET_ORDER) {
        const percentage = BUCKET_PERCENTAGES[bucket];
        const allocated = Math.floor((monthlyIncome * percentage) / 100);
        const allocation = await sqliteBudgetRepository.createBudgetAllocation({
          budgetMonthId: budgetMonth.id,
          bucket,
          allocated,
        });
        allocations.push(allocation);
      }

      months.push({
        ...budgetMonth,
        allocations,
      });
    }

    return { budgetYear, months };
  },
};
