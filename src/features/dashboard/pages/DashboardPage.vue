<template>
  <div class="page-container">
    <div class="dashboard-header">
      <div class="month-selector">
        <Button icon="pi pi-chevron-left" severity="secondary" outlined @click="previousMonth" />
        <DatePicker
          v-model="selectedPeriod"
          view="month"
          date-format="MM yy"
          :manual-input="false"
          class="month-picker"
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
        button-class="w-full"
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
            <option value="">Select category</option>
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
import { getBudgetMonth, getBudgetYearByYear, getLatestBudgetYear } from '@/data/repositories';
import type { BudgetAllocation, BudgetMonth, BudgetYear } from '@/domain/entities';
import { Input } from '@/shared/components/atoms';
import { BucketDisplay } from '@/shared/components/molecules';
import { useCurrency } from '@/shared/composables/useCurrency';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import Dialog from 'primevue/dialog';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const router = useRouter();
const toast = useToast();
const { t } = useI18n();
const { formatCurrency: formatCurrencyValue } = useCurrency();

const budgetYear = ref<BudgetYear | null>(null);
const budgetMonth = ref<BudgetMonth | null>(null);
const selectedPeriod = ref<Date | null>(new Date());

const showAddExpense = ref(false);
const expenseAmount = ref<string>('');
const expenseCategory = ref('');

const categories = ['needs', 'wants', 'savings'];

const allocations = computed<BudgetAllocation[]>(() => {
  return budgetMonth.value?.allocations || [];
});

const isExpenseValid = computed(() => {
  const amount = parseFloat(expenseAmount.value);
  return !isNaN(amount) && amount > 0 && expenseCategory.value !== '';
});

function previousMonth(): void {
  if (!selectedPeriod.value) {
    selectedPeriod.value = new Date();
    return;
  }

  const nextDate = new Date(selectedPeriod.value);
  nextDate.setMonth(nextDate.getMonth() - 1);
  selectedPeriod.value = nextDate;
}

function nextMonth(): void {
  if (!selectedPeriod.value) {
    selectedPeriod.value = new Date();
    return;
  }

  const nextDate = new Date(selectedPeriod.value);
  nextDate.setMonth(nextDate.getMonth() + 1);
  selectedPeriod.value = nextDate;
}

async function loadMonthData(): Promise<void> {
  if (!selectedPeriod.value) return;

  const selectedYear = selectedPeriod.value.getFullYear();
  const selectedMonth = selectedPeriod.value.getMonth() + 1;

  const resolvedBudgetYear = await getBudgetYearByYear(selectedYear);
  if (!resolvedBudgetYear) {
    budgetYear.value = null;
    budgetMonth.value = null;
    return;
  }

  budgetYear.value = resolvedBudgetYear;
  budgetMonth.value = await getBudgetMonth(resolvedBudgetYear.id, selectedMonth);
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

    const defaultMonth = new Date().getMonth();
    selectedPeriod.value = new Date(year.year, defaultMonth, 1);
    await loadMonthData();
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

watch(selectedPeriod, async (newValue) => {
  if (!newValue) {
    selectedPeriod.value = new Date();
    return;
  }

  try {
    await loadMonthData();
  } catch (error) {
    console.error('Failed to load month data:', error);
    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('setup.errorCreating'),
      life: 3000,
    });
  }
});

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

.w-full {
  width: 100%;
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
