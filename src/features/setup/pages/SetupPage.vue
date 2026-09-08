<template>
  <div class="page-container">
    <div class="setup-header">
      <i class="pi pi-wallet" style="font-size: 3rem; margin-bottom: 1rem"></i>
      <h1 class="title">{{ t('setup.title') }}</h1>
      <p class="subtitle">{{ t('setup.subtitle') }}</p>
    </div>

    <Card class="setup-card">
      <template #content>
        <div class="form-group">
          <label for="language">{{ t('settings.language') }}</label>
          <select id="language" v-model="selectedLocale" class="currency-select">
            <option v-for="lang in supportedLocales" :key="lang.code" :value="lang.code">
              {{ lang.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="currency">{{ t('settings.currency') }}</label>
          <select id="currency" v-model="selectedCurrency" class="currency-select">
            <option v-for="curr in supportedCurrencies" :key="curr.code" :value="curr.code">
              {{ curr.symbol }} - {{ curr.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="income">{{ t('setup.monthlyIncome') }}</label>
          <div class="input-wrapper">
            <span class="currency-symbol">{{ currencyInfo.symbol }}</span>
            <Input
              id="income"
              v-model="monthlyIncome"
              :placeholder="t('setup.incomePlaceholder')"
            />
          </div>
          <p class="help-text">{{ t('setup.incomeHelp') }}</p>
        </div>

        <div class="preview-section" v-if="monthlyIncomeNumber > 0">
          <h3 class="preview-title">{{ t('setup.previewBreakdown') }}</h3>
          <div class="preview-row">
            <span class="preview-label">{{ t('groups.needs') }} (50%)</span>
            <span class="preview-value">{{ formatCurrencyValue(needsAmount) }}</span>
          </div>
          <div class="preview-row">
            <span class="preview-label">{{ t('groups.wants') }} (30%)</span>
            <span class="preview-value">{{ formatCurrencyValue(wantsAmount) }}</span>
          </div>
          <div class="preview-row">
            <span class="preview-label">{{ t('groups.savings') }} (20%)</span>
            <span class="preview-value">{{ formatCurrencyValue(savingsAmount) }}</span>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="button-group">
          <Button
            :label="t('setup.createBudget')"
            icon="pi pi-check"
            :loading="isLoading"
            :disabled="!isValid"
            class="w-full"
            @click="createBudget"
          />
          <Button
            :label="t('dashboard.importDatabase')"
            icon="pi pi-upload"
            severity="secondary"
            outlined
            class="w-full"
            @click="openImportDatabasePicker"
          />
          <input
            ref="importFileInput"
            type="file"
            accept="application/json,.json"
            class="visually-hidden"
            @change="onImportFileSelected"
          />
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { initDatabase } from '@/data/database';
import {
  createYearWithAllocations,
  getBudgetMonth,
  getLatestBudgetYear,
  importDatabase as importDatabaseSnapshot,
} from '@/data/repositories';
import { Button, Card, Input } from '@/shared/components/atoms';
import { useCurrency, type SupportedCurrency } from '@/shared/composables/useCurrency';
import { getLocale, setLocale, supportedLocales, type SupportedLocale } from '@/shared/i18n';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const router = useRouter();
const toast = useToast();
const { t } = useI18n();
const {
  currency,
  currencyInfo,
  setCurrency,
  formatCurrency: formatCurrencyValue,
  supportedCurrencies,
} = useCurrency();

const monthlyIncome = ref<string>('');
const isLoading = ref(false);
const importFileInput = ref<HTMLInputElement | null>(null);
const selectedLocale = ref<SupportedLocale>(getLocale());
const selectedCurrency = ref<SupportedCurrency>(currency.value);

watch(selectedLocale, (newVal) => {
  setLocale(newVal);
});

watch(selectedCurrency, (newVal) => {
  setCurrency(newVal);
});

const monthlyIncomeNumber = computed(() => {
  const num = parseFloat(monthlyIncome.value);
  return isNaN(num) ? 0 : num * 100;
});

const needsAmount = computed(() => Math.floor(monthlyIncomeNumber.value * 0.5));
const wantsAmount = computed(() => Math.floor(monthlyIncomeNumber.value * 0.3));
const savingsAmount = computed(() => Math.floor(monthlyIncomeNumber.value * 0.2));

const isValid = computed(() => monthlyIncomeNumber.value > 0);

async function hasAnyMonthForYear(budgetYearId: string): Promise<boolean> {
  for (let month = 1; month <= 12; month++) {
    const budgetMonth = await getBudgetMonth(budgetYearId, month);
    if (budgetMonth) {
      return true;
    }
  }

  return false;
}

async function createBudget(): Promise<void> {
  if (!isValid.value) return;

  isLoading.value = true;

  try {
    await initDatabase();

    const existing = await getLatestBudgetYear();
    const currentYear = new Date().getFullYear();

    if (existing && existing.year === currentYear && (await hasAnyMonthForYear(existing.id))) {
      toast.add({
        severity: 'warn',
        summary: t('setup.budgetExists'),
        detail: `${currentYear}`,
        life: 3000,
      });
      router.push('/dashboard');
      return;
    }

    await createYearWithAllocations(monthlyIncomeNumber.value, currentYear, selectedCurrency.value);

    toast.add({
      severity: 'success',
      summary: t('setup.budgetCreated'),
      detail: `${currentYear}`,
      life: 3000,
    });

    router.push('/dashboard');
  } catch (error) {
    console.error('Failed to create budget:', error);
    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('setup.errorCreating'),
      life: 3000,
    });
  } finally {
    isLoading.value = false;
  }
}

async function checkExistingBudget(): Promise<void> {
  try {
    await initDatabase();
    const existing = await getLatestBudgetYear();
    if (existing && (await hasAnyMonthForYear(existing.id))) {
      router.replace('/dashboard');
    }
  } catch (error) {
    console.error('Failed to check existing budget on setup page:', error);
  }
}

function openImportDatabasePicker(): void {
  importFileInput.value?.click();
}

function resetImportInput(): void {
  if (importFileInput.value) {
    importFileInput.value.value = '';
  }
}

async function onImportFileSelected(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) {
    resetImportInput();
    return;
  }

  isLoading.value = true;

  try {
    const fileContents = await file.text();
    const parsedSnapshot = JSON.parse(fileContents) as unknown;
    await importDatabaseSnapshot(parsedSnapshot);

    toast.add({
      severity: 'success',
      summary: t('dashboard.databaseImported'),
      detail: t('dashboard.databaseImported'),
      life: 3000,
    });

    router.push('/dashboard');
  } catch (error) {
    const reason = error instanceof Error ? error.message : t('dashboard.databaseImportError');
    console.error('Failed to import database snapshot from setup page', { error });
    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('dashboard.databaseImportErrorWithReason', { reason }),
      life: 5000,
    });
  } finally {
    isLoading.value = false;
    resetImportInput();
  }
}

onMounted(() => {
  checkExistingBudget();
});
</script>

<style scoped>
.setup-header {
  text-align: center;
  margin-bottom: 2rem;
}

.title {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--p-text-muted-color);
}

.setup-card {
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.currency-select {
  width: 100%;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--p-input-border-color);
  background: var(--p-input-background);
  color: var(--p-input-color);
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.currency-symbol {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
}

.help-text {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  margin-top: 0.5rem;
}

.preview-section {
  padding: 1rem;
  background: var(--p-surface-100);
  border-radius: 8px;
}

.preview-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--p-text-muted-color);
}

.preview-row {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
}

.preview-label {
  color: var(--p-text-color);
}

.preview-value {
  font-weight: 600;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
