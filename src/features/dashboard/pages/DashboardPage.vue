<template>
  <div class="page-container">
    <div class="dashboard-header">
      <div class="month-selector">
        <Button icon="pi pi-chevron-left" severity="secondary" outlined @click="previousMonth" />
        <DatePicker
          :model-value="selectedPeriod"
          view="month"
          date-format="MM yy"
          :manual-input="false"
          update-model-type="date"
          class="month-picker"
          @update:model-value="onPeriodChange"
        />
        <Button icon="pi pi-chevron-right" severity="secondary" outlined @click="nextMonth" />
      </div>
    </div>

    <div class="budget-summary" v-if="budgetMonth && budgetYear">
      <div class="summary-card">
        <span class="summary-label">{{ t('dashboard.monthlyIncome') }}</span>
        <span class="summary-value">{{ formatCurrencyValue(budgetYear.monthlyIncome) }}</span>
      </div>
    </div>

    <div v-if="budgetMonth" class="buckets-section">
      <BucketDisplay
        v-for="allocation in allocations"
        :key="allocation.bucket"
        :bucket="allocation.bucket"
        :allocated="allocation.allocated"
        :spent="allocation.spent"
      />
    </div>

    <div v-else class="empty-state">
      <p>{{ t('dashboard.noBudgetForPeriod') }}</p>
    </div>

    <div v-if="budgetMonth && budgetYear" class="actions-section">
      <Button
        :label="t('dashboard.addExpense')"
        icon="pi pi-plus"
        class="w-full"
        @click="showAddExpense = true"
      />
    </div>

    <Dialog
      v-model:visible="showAddExpense"
      modal
      :header="t('dashboard.addExpense')"
      :style="{ width: '90vw' }"
    >
      <div class="expense-form">
        <div class="form-group">
          <label>{{ t('setup.monthlyIncome') }}</label>
          <Input v-model="expenseAmount" :placeholder="t('setup.incomePlaceholder')" />
        </div>
        <div class="form-group">
          <label>{{ t('settings.currency') }}</label>
          <select v-model="expenseCategory" class="category-select">
            <option value="">{{ t('dashboard.selectCategory') }}</option>
            <option v-for="cat in categories" :key="cat" :value="cat">
              {{ t(`buckets.${cat}`) }}
            </option>
          </select>
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" @click="showAddExpense = false" />
        <Button
          :label="t('common.add')"
          icon="pi pi-check"
          :disabled="!isExpenseValid"
          @click="addExpense"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { initDatabase } from '@/data/database';
import {
  createBudgetAllocation,
  createBudgetMonth,
  createYearWithAllocations,
  getBudgetMonth,
  getBudgetYearByYear,
  getLatestBudgetYear,
} from '@/data/repositories';
import {
  BUCKET_ORDER,
  BUCKET_PERCENTAGES,
  compareBuckets,
  type BudgetAllocation,
  type BudgetMonth,
  type BudgetYear,
} from '@/domain/entities';
import { Input } from '@/shared/components/atoms';
import { BucketDisplay } from '@/shared/components/molecules';
import { useCurrency } from '@/shared/composables/useCurrency';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import Dialog from 'primevue/dialog';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const router = useRouter();
const toast = useToast();
const { t } = useI18n();
const { formatCurrency: formatCurrencyValue } = useCurrency();

const budgetYear = ref<BudgetYear | null>(null);
const budgetMonth = ref<BudgetMonth | null>(null);
const activeYear = ref(new Date().getFullYear());
const activeMonth = ref(new Date().getMonth() + 1);
const selectedPeriod = ref<Date>(new Date(activeYear.value, activeMonth.value - 1, 1));
let isRepairingYear = false;
let isRebuildingYear = false;

const showAddExpense = ref(false);
const expenseAmount = ref<string>('');
const expenseCategory = ref('');

const categories = BUCKET_ORDER;

const allocations = computed<BudgetAllocation[]>(() => {
  return [...(budgetMonth.value?.allocations ?? [])].sort((left, right) =>
    compareBuckets(left.bucket, right.bucket),
  );
});

const isExpenseValid = computed(() => {
  const amount = parseFloat(expenseAmount.value);
  return !isNaN(amount) && amount > 0 && expenseCategory.value !== '';
});

function setActivePeriod(year: number, month: number): void {
  const normalizedYear = Number(year);
  const normalizedMonth = Number(month);

  if (!Number.isFinite(normalizedYear) || !Number.isFinite(normalizedMonth)) {
    return;
  }

  const clampedMonth = Math.min(12, Math.max(1, Math.trunc(normalizedMonth)));
  const normalizedDate = new Date(Math.trunc(normalizedYear), clampedMonth - 1, 1);

  activeYear.value = normalizedDate.getFullYear();
  activeMonth.value = normalizedDate.getMonth() + 1;
  selectedPeriod.value = new Date(activeYear.value, activeMonth.value - 1, 1);
}

function previousMonth(): void {
  shiftMonth(-1);
}

function nextMonth(): void {
  shiftMonth(1);
}

async function loadMonthData(): Promise<void> {
  const normalizedYear = Number(activeYear.value);
  const normalizedMonth = Number(activeMonth.value);

  if (!Number.isFinite(normalizedYear) || !Number.isFinite(normalizedMonth)) {
    budgetYear.value = null;
    budgetMonth.value = null;
    return;
  }

  const resolvedBudgetYear = await getBudgetYearByYear(normalizedYear);
  if (!resolvedBudgetYear) {
    budgetYear.value = null;
    budgetMonth.value = null;
    return;
  }

  budgetYear.value = resolvedBudgetYear;
  const selectedMonthData = await getBudgetMonth(resolvedBudgetYear.id, normalizedMonth);
  if (selectedMonthData) {
    budgetMonth.value = selectedMonthData;
    return;
  }

  for (let month = 1; month <= 12; month++) {
    const monthData = await getBudgetMonth(resolvedBudgetYear.id, month);
    if (monthData) {
      setActivePeriod(resolvedBudgetYear.year, month);
      budgetMonth.value = monthData;
      return;
    }
  }

  if (!isRepairingYear) {
    isRepairingYear = true;

    try {
      await repairMissingMonths(resolvedBudgetYear);
      const repairedMonth = await getBudgetMonth(resolvedBudgetYear.id, activeMonth.value);
      if (repairedMonth) {
        budgetMonth.value = repairedMonth;
        return;
      }

      for (let month = 1; month <= 12; month++) {
        const monthData = await getBudgetMonth(resolvedBudgetYear.id, month);
        if (monthData) {
          setActivePeriod(resolvedBudgetYear.year, month);
          budgetMonth.value = monthData;
          return;
        }
      }
    } finally {
      isRepairingYear = false;
    }
  }

  if (!isRebuildingYear) {
    isRebuildingYear = true;

    try {
      const rebuilt = await createYearWithAllocations(
        resolvedBudgetYear.monthlyIncome,
        resolvedBudgetYear.year,
        resolvedBudgetYear.currency,
      );

      budgetYear.value = rebuilt.budgetYear;

      const rebuiltMonth = await getBudgetMonth(rebuilt.budgetYear.id, activeMonth.value);
      if (rebuiltMonth) {
        budgetMonth.value = rebuiltMonth;
        return;
      }

      for (let month = 1; month <= 12; month++) {
        const monthData = await getBudgetMonth(rebuilt.budgetYear.id, month);
        if (monthData) {
          setActivePeriod(rebuilt.budgetYear.year, month);
          budgetMonth.value = monthData;
          return;
        }
      }
    } catch (error) {
      console.error('Failed to rebuild budget year data', error);
    } finally {
      isRebuildingYear = false;
    }
  }

  budgetMonth.value = null;
}

async function repairMissingMonths(year: BudgetYear): Promise<void> {
  if (!Number.isFinite(year.monthlyIncome) || year.monthlyIncome <= 0) {
    console.error('Cannot repair budget year with invalid monthly income', year);
    return;
  }

  for (let month = 1; month <= 12; month++) {
    let existingMonth = await getBudgetMonth(year.id, month);

    if (!existingMonth) {
      try {
        const createdMonth = await createBudgetMonth({
          budgetYearId: year.id,
          month,
          year: year.year,
        });

        existingMonth = {
          ...createdMonth,
          allocations: [],
        };
      } catch (error) {
        console.warn('Failed to create missing month, retrying fetch', {
          year: year.year,
          month,
          error,
        });

        existingMonth = await getBudgetMonth(year.id, month);
      }
    }

    if (!existingMonth) {
      continue;
    }

    for (const bucket of BUCKET_ORDER) {
      const percentage = BUCKET_PERCENTAGES[bucket];
      const hasAllocation = existingMonth.allocations.some((item) => item.bucket === bucket);
      if (hasAllocation) {
        continue;
      }

      const allocated = Math.floor((year.monthlyIncome * percentage) / 100);

      try {
        await createBudgetAllocation({
          budgetMonthId: existingMonth.id,
          bucket,
          allocated,
        });
      } catch (error) {
        console.warn('Failed to create missing allocation, continuing', {
          year: year.year,
          month,
          bucket,
          error,
        });
      }
    }
  }
}

async function refreshMonthData(): Promise<void> {
  try {
    await loadMonthData();
  } catch (error) {
    console.error('Failed to load month data:', error);
  }
}

function shiftMonth(delta: number): void {
  const nextDate = new Date(activeYear.value, activeMonth.value - 1, 1);
  nextDate.setMonth(nextDate.getMonth() + delta);

  setActivePeriod(nextDate.getFullYear(), nextDate.getMonth() + 1);
  void refreshMonthData();
}

function toDate(value: unknown): Date | null {
  if (value && typeof value === 'object' && 'value' in value) {
    return toDate((value as { value: unknown }).value);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (Array.isArray(value)) {
    const firstValid = value.find(
      (entry) => entry instanceof Date && !Number.isNaN(entry.getTime()),
    );
    return firstValid ?? null;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function onPeriodChange(value: unknown): void {
  const parsedDate = toDate(value);
  if (!parsedDate) {
    console.error('Invalid period received from DatePicker', value);
    selectedPeriod.value = new Date(activeYear.value, activeMonth.value - 1, 1);
    return;
  }

  setActivePeriod(parsedDate.getFullYear(), parsedDate.getMonth() + 1);
  void refreshMonthData();
}

async function addExpense(): Promise<void> {
  if (!isExpenseValid.value || !budgetMonth.value) return;

  toast.add({
    severity: 'info',
    summary: t('common.comingSoon'),
    detail: t('common.comingSoon'),
    life: 3000,
  });

  showAddExpense.value = false;
  expenseAmount.value = '';
  expenseCategory.value = '';
}

async function loadData(): Promise<void> {
  try {
    await initDatabase();

    const year = await getLatestBudgetYear();
    if (!year) {
      router.replace('/setup');
      return;
    }

    setActivePeriod(year.year, new Date().getMonth() + 1);
    await refreshMonthData();
  } catch (error) {
    console.error('Failed to load data:', error);
    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('setup.errorCreating'),
      life: 3000,
    });
  }
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.dashboard-header {
  margin-bottom: 1.5rem;
}

.month-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.month-picker {
  min-width: 170px;
}

.empty-state {
  margin: 2rem 0;
  text-align: center;
  color: var(--p-text-muted-color);
}

.budget-summary {
  margin-bottom: 1.5rem;
}

.summary-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
  border-radius: 8px;
}

.summary-label {
  font-size: 0.875rem;
  opacity: 0.9;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.buckets-section {
  margin-bottom: 1.5rem;
}

.actions-section {
  margin-top: 1rem;
}

.expense-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
}

.category-select {
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--p-input-border-color);
  background: var(--p-input-background);
  color: var(--p-input-color);
}
</style>
