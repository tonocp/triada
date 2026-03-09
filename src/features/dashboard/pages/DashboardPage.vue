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
        :interactive="true"
        @select="openExpenseHistory"
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
          <label>{{ t('dashboard.category') }}</label>
          <div class="category-options" role="radiogroup" :aria-label="t('dashboard.category')">
            <label
              v-for="cat in categories"
              :key="cat"
              class="category-option"
              :class="{ 'category-option--selected': expenseCategory === cat }"
            >
              <RadioButton
                v-model="expenseCategory"
                name="expense-category"
                :input-id="`expense-category-${cat}`"
                :value="cat"
              />
              <span>{{ t(`buckets.${cat}`) }}</span>
            </label>
          </div>
        </div>
        <div class="form-group">
          <label>{{ t('dashboard.amount') }}</label>
          <Input
            v-model="expenseAmount"
            id="expense-amount"
            type="number"
            inputmode="decimal"
            :placeholder="t('setup.incomePlaceholder')"
            :disabled="expenseCategory === ''"
            input-class="w-full"
          />
        </div>
        <div class="form-group">
          <label>{{ t('dashboard.description') }}</label>
          <Input
            v-model="expenseDescription"
            :placeholder="t('dashboard.descriptionPlaceholder')"
            :disabled="expenseCategory === ''"
            input-class="w-full"
          />
        </div>
        <div class="form-group recurring-toggle">
          <Checkbox v-model="isRecurringExpense" binary input-id="expense-recurring" />
          <label for="expense-recurring">{{ t('dashboard.recurringExpense') }}</label>
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

    <Dialog
      v-model:visible="showExpenseHistory"
      modal
      :header="expenseHistoryTitle"
      :style="{ width: '90vw' }"
    >
      <div v-if="selectedBucketExpenses.length === 0" class="empty-state">
        <p>{{ t('dashboard.noExpensesForCategory') }}</p>
      </div>
      <ul v-else class="expense-history-list">
        <li
          v-for="expense in selectedBucketExpenses"
          :key="expense.id"
          class="expense-history-item"
        >
          <div class="expense-history-content">
            <span class="expense-history-amount">{{ formatCurrencyValue(expense.amount) }}</span>
            <span class="expense-history-description">{{ expense.description }}</span>
            <span v-if="expense.recurringRuleId" class="expense-history-recurring">
              {{ t('dashboard.recurring') }}
            </span>
            <span class="expense-history-date">{{ formatExpenseDate(expense.createdAt) }}</span>
          </div>
          <div class="expense-history-actions">
            <Button
              icon="pi pi-pencil"
              text
              rounded
              severity="secondary"
              :aria-label="t('dashboard.editExpense')"
              @click="startExpenseEdit(expense)"
            />
            <Button
              icon="pi pi-trash"
              text
              rounded
              severity="danger"
              :aria-label="t('dashboard.deleteExpense')"
              @click="askExpenseDelete(expense)"
            />
          </div>
        </li>
      </ul>
      <template #footer>
        <Button
          :label="t('common.close')"
          severity="secondary"
          @click="showExpenseHistory = false"
        />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="showEditExpense"
      modal
      :header="t('dashboard.editExpense')"
      :style="{ width: '90vw' }"
    >
      <div class="expense-form">
        <div class="form-group">
          <label>{{ t('dashboard.amount') }}</label>
          <Input
            v-model="editExpenseAmount"
            id="edit-expense-amount"
            type="number"
            inputmode="decimal"
            :placeholder="t('setup.incomePlaceholder')"
            input-class="w-full"
          />
        </div>
        <div class="form-group">
          <label>{{ t('dashboard.description') }}</label>
          <Input
            v-model="editExpenseDescription"
            id="edit-expense-description"
            :placeholder="t('dashboard.descriptionPlaceholder')"
            input-class="w-full"
          />
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" @click="showEditExpense = false" />
        <Button
          id="save-expense-edit"
          :label="t('common.save')"
          icon="pi pi-check"
          :disabled="!isEditExpenseValid"
          @click="saveExpenseEdit"
        />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="showDeleteExpenseConfirm"
      modal
      :header="t('dashboard.deleteExpense')"
      :style="{ width: '90vw' }"
    >
      <p>{{ t('dashboard.confirmDeleteExpense') }}</p>
      <template #footer>
        <Button
          :label="t('common.cancel')"
          severity="secondary"
          @click="showDeleteExpenseConfirm = false"
        />
        <Button
          id="confirm-expense-delete"
          :label="t('dashboard.deleteExpense')"
          severity="danger"
          @click="confirmExpenseDelete"
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
  addExpense as createExpenseRecord,
  createYearWithAllocations,
  deleteExpense as deleteExpenseRecord,
  getBudgetMonth,
  getBudgetYearByYear,
  getExpensesByMonthAndBucket,
  getLatestBudgetYear,
  updateExpense as updateExpenseRecord,
} from '@/data/repositories';
import {
  BUCKET_ORDER,
  BUCKET_PERCENTAGES,
  compareBuckets,
  type BucketType,
  type BudgetAllocation,
  type BudgetMonth,
  type BudgetYear,
  type Expense,
} from '@/domain/entities';
import { Input } from '@/shared/components/atoms';
import { BucketDisplay } from '@/shared/components/molecules';
import { useCurrency } from '@/shared/composables/useCurrency';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import DatePicker from 'primevue/datepicker';
import Dialog from 'primevue/dialog';
import RadioButton from 'primevue/radiobutton';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const router = useRouter();
const toast = useToast();
const { t, locale } = useI18n();
const { formatCurrency: formatCurrencyValue } = useCurrency();

const budgetYear = ref<BudgetYear | null>(null);
const budgetMonth = ref<BudgetMonth | null>(null);
const activeYear = ref(new Date().getFullYear());
const activeMonth = ref(new Date().getMonth() + 1);
const selectedPeriod = ref<Date>(new Date(activeYear.value, activeMonth.value - 1, 1));
let isRepairingYear = false;
let isRebuildingYear = false;

const showAddExpense = ref(false);
const showExpenseHistory = ref(false);
const showEditExpense = ref(false);
const showDeleteExpenseConfirm = ref(false);
const expenseAmount = ref('');
const expenseCategory = ref<BucketType | ''>('');
const expenseDescription = ref('');
const isRecurringExpense = ref(false);
const selectedHistoryBucket = ref<BucketType | null>(null);
const selectedBucketExpenses = ref<Expense[]>([]);
const editingExpenseId = ref<string | null>(null);
const editExpenseAmount = ref('');
const editExpenseDescription = ref('');
const expensePendingDelete = ref<Expense | null>(null);

const categories = BUCKET_ORDER;

const allocations = computed<BudgetAllocation[]>(() => {
  return [...(budgetMonth.value?.allocations ?? [])].sort((left, right) =>
    compareBuckets(left.bucket, right.bucket),
  );
});

const isExpenseValid = computed(() => {
  const amount = parseFloat(expenseAmount.value);
  const description = expenseDescription.value.trim();
  return (
    !Number.isNaN(amount) && amount > 0 && expenseCategory.value !== '' && description.length >= 3
  );
});

const isEditExpenseValid = computed(() => {
  const amount = parseFloat(editExpenseAmount.value);
  const description = editExpenseDescription.value.trim();
  return !Number.isNaN(amount) && amount > 0 && description.length >= 3;
});

const expenseHistoryTitle = computed(() => {
  if (!selectedHistoryBucket.value) {
    return t('dashboard.expenseHistoryTitle', { category: '' });
  }

  return t('dashboard.expenseHistoryTitle', {
    category: t(`buckets.${selectedHistoryBucket.value}`),
  });
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

function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

function fromMinorUnits(amount: number): string {
  return (amount / 100).toFixed(2);
}

async function addExpense(): Promise<void> {
  if (!isExpenseValid.value || !budgetMonth.value) {
    return;
  }

  const normalizedAmount = parseFloat(expenseAmount.value);
  const amount = toMinorUnits(normalizedAmount);
  const selectedCategory = expenseCategory.value;
  const description = expenseDescription.value.trim();

  if (amount <= 0 || selectedCategory === '' || description.length < 3) {
    return;
  }

  try {
    await createExpenseRecord({
      budgetMonthId: budgetMonth.value.id,
      bucket: selectedCategory,
      amount,
      description,
      isRecurring: isRecurringExpense.value,
    });

    await refreshMonthData();
    if (showExpenseHistory.value && selectedHistoryBucket.value === selectedCategory) {
      await refreshExpenseHistory();
    }

    toast.add({
      severity: 'success',
      summary: t('dashboard.expenseAdded'),
      detail: t('dashboard.expenseAdded'),
      life: 3000,
    });

    showAddExpense.value = false;
    expenseAmount.value = '';
    expenseCategory.value = '';
    expenseDescription.value = '';
    isRecurringExpense.value = false;
  } catch (error) {
    console.error('Failed to add expense to allocation', {
      error,
      budgetMonthId: budgetMonth.value.id,
      bucket: expenseCategory.value,
      amount,
      description,
    });

    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('dashboard.expenseAddError'),
      life: 3000,
    });
  }
}

function formatExpenseDate(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale.value === 'es' ? 'es-ES' : 'en-US', {
    dateStyle: 'medium',
  }).format(parsed);
}

async function openExpenseHistory(bucket: BucketType): Promise<void> {
  if (!budgetMonth.value) {
    return;
  }

  selectedHistoryBucket.value = bucket;

  try {
    await refreshExpenseHistory();
    showExpenseHistory.value = true;
  } catch (error) {
    console.error('Failed to load expenses for bucket', {
      error,
      budgetMonthId: budgetMonth.value.id,
      bucket,
    });

    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('dashboard.expenseHistoryError'),
      life: 3000,
    });
  }
}

async function refreshExpenseHistory(): Promise<void> {
  if (!budgetMonth.value || !selectedHistoryBucket.value) {
    selectedBucketExpenses.value = [];
    return;
  }

  selectedBucketExpenses.value = await getExpensesByMonthAndBucket(
    budgetMonth.value.id,
    selectedHistoryBucket.value,
  );
}

function startExpenseEdit(expense: Expense): void {
  editingExpenseId.value = expense.id;
  editExpenseAmount.value = fromMinorUnits(expense.amount);
  editExpenseDescription.value = expense.description;
  showEditExpense.value = true;
}

async function saveExpenseEdit(): Promise<void> {
  if (!isEditExpenseValid.value || !editingExpenseId.value) {
    return;
  }

  const amount = toMinorUnits(parseFloat(editExpenseAmount.value));
  const description = editExpenseDescription.value.trim();

  if (amount <= 0 || description.length < 3) {
    return;
  }

  try {
    await updateExpenseRecord({
      expenseId: editingExpenseId.value,
      amount,
      description,
    });

    await refreshMonthData();
    await refreshExpenseHistory();

    showEditExpense.value = false;
    toast.add({
      severity: 'success',
      summary: t('dashboard.expenseUpdated'),
      detail: t('dashboard.expenseUpdated'),
      life: 3000,
    });
  } catch (error) {
    console.error('Failed to update expense', { error, expenseId: editingExpenseId.value });
    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('dashboard.expenseUpdateError'),
      life: 3000,
    });
  }
}

function askExpenseDelete(expense: Expense): void {
  expensePendingDelete.value = expense;
  showDeleteExpenseConfirm.value = true;
}

async function confirmExpenseDelete(): Promise<void> {
  if (!expensePendingDelete.value) {
    return;
  }

  const targetExpense = expensePendingDelete.value;

  try {
    await deleteExpenseRecord(targetExpense.id);

    await refreshMonthData();
    await refreshExpenseHistory();

    showDeleteExpenseConfirm.value = false;
    expensePendingDelete.value = null;

    toast.add({
      severity: 'success',
      summary: t('dashboard.expenseDeleted'),
      detail: t('dashboard.expenseDeleted'),
      life: 3000,
    });
  } catch (error) {
    console.error('Failed to delete expense', {
      error,
      expenseId: targetExpense.id,
    });
    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('dashboard.expenseDeleteError'),
      life: 3000,
    });
  }
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

.recurring-toggle {
  flex-direction: row;
  align-items: center;
}

.form-group label {
  font-weight: 600;
}

.category-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.category-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--p-input-border-color);
  background: var(--p-content-background);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.category-option--selected {
  border-color: var(--p-primary-color);
  background: color-mix(in srgb, var(--p-primary-color) 10%, var(--p-content-background));
}

.expense-history-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.expense-history-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--p-input-border-color);
  border-radius: 8px;
}

.expense-history-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.expense-history-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.expense-history-amount {
  font-weight: 700;
}

.expense-history-description {
  font-weight: 500;
}

.expense-history-date {
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.expense-history-recurring {
  width: fit-content;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-primary-color);
}
</style>
