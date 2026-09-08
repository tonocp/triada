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

        <div class="form-group">
          <label>{{ t('settings.budgetSplit') }}</label>
          <BudgetSplitEditor v-model="split" />
        </div>

        <div class="preview-section" v-if="monthlyIncomeNumber > 0">
          <h3 class="preview-title">{{ t('setup.previewBreakdown') }}</h3>
          <div v-for="group in groups" :key="`preview-${group}`" class="preview-row">
            <span class="preview-label">{{ t(`groups.${group}`) }} ({{ split[group] }}%)</span>
            <span class="preview-value">{{ formatCurrencyValue(previewAllocations[group]) }}</span>
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
  importDatabase as importDatabaseSnapshot,
} from '@/data/repositories';
import {
  DEFAULT_GROUP_SPLIT,
  GROUP_ORDER,
  allocateBudget,
  isValidBudgetSplit,
  type BudgetSplit,
} from '@/domain/entities';
import { Button, Card, Input } from '@/shared/components/atoms';
import { BudgetSplitEditor } from '@/shared/components/molecules';
import { useCurrency, type SupportedCurrency } from '@/shared/composables/useCurrency';
import { getLocale, setLocale, supportedLocales, type SupportedLocale } from '@/shared/i18n';
import { useToast } from 'primevue/usetoast';
import { computed, ref, watch } from 'vue';
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

const groups = GROUP_ORDER;
const split = ref<BudgetSplit>({ ...DEFAULT_GROUP_SPLIT });

const monthlyIncomeNumber = computed(() => {
  const num = parseFloat(monthlyIncome.value);
  return isNaN(num) ? 0 : num * 100;
});

const previewAllocations = computed(() => allocateBudget(monthlyIncomeNumber.value, split.value));

const isValid = computed(() => monthlyIncomeNumber.value > 0 && isValidBudgetSplit(split.value));

async function createBudget(): Promise<void> {
  if (!isValid.value) return;

  isLoading.value = true;

  try {
    await initDatabase();

    // The router guard keeps this screen unreachable once a budget exists, so
    // this always creates a fresh one.
    const currentYear = new Date().getFullYear();
    await createYearWithAllocations(
      monthlyIncomeNumber.value,
      currentYear,
      selectedCurrency.value,
      split.value,
    );

    toast.add({
      severity: 'success',
      summary: t('setup.budgetCreated'),
      detail: `${currentYear}`,
      life: 3000,
    });

    router.push({ name: 'year' });
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

    router.push({ name: 'year' });
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
