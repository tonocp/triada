<template>
  <div class="page-container">
    <header class="year-summary-header">
      <h1>{{ t('dashboard.yearSummaryTitle') }}</h1>
    </header>

    <section class="year-switcher" :aria-label="t('dashboard.yearSummaryTitle')">
      <Button
        id="year-summary-previous-year"
        icon="pi pi-chevron-left"
        severity="secondary"
        text
        @click="changeYear(-1)"
      />
      <span class="year-label">{{ activeYear }}</span>
      <Button
        id="year-summary-next-year"
        icon="pi pi-chevron-right"
        severity="secondary"
        text
        @click="changeYear(1)"
      />
    </section>

    <div v-if="loading" class="year-summary-state">
      <p>{{ t('common.loading') }}</p>
    </div>

    <div v-else-if="hasError" class="year-summary-state">
      <p>{{ t('dashboard.yearSummaryLoadError') }}</p>
    </div>

    <template v-else>
      <section class="budget-summary">
        <BudgetHero
          :label="t('dashboard.annualPlannedIncome')"
          :income="annualIncomePlanned"
          :buckets="summary.totalsByGroup"
          :ring-size="150"
          :ring-caption="t('dashboard.spent')"
          :ring-value="`${yearProgress}%`"
        />
      </section>

      <section class="groups-section" aria-label="annual-bucket-totals">
        <div
          v-for="bucket in summary.totalsByGroup"
          :key="`annual-total-${bucket.group}`"
          :data-testid="`annual-group-${bucket.group}`"
        >
          <GroupDisplay
            :group="bucket.group"
            :allocated="bucket.allocated"
            :spent="bucket.spent"
            :interactive="false"
          />
        </div>
      </section>

      <template v-if="yearExpenses.length > 0">
        <section class="insights-section" aria-label="year-insights">
          <h2 class="insights-heading">{{ t('dashboard.insightsTrend') }}</h2>
          <SpendTrend :rows="trendRows" />
        </section>

        <section class="insights-section" aria-label="year-top-categories">
          <h2 class="insights-heading">{{ t('dashboard.insightsTopCategories') }}</h2>
          <TopCategories :entries="topEntries" />
        </section>
      </template>

      <p v-else class="insights-empty">{{ t('dashboard.insightsNoData') }}</p>

      <section class="months-grid" aria-label="year-month-grid">
        <button
          v-for="month in summary.months"
          :key="`month-${activeYear}-${month.month}`"
          class="month-card"
          type="button"
          :data-testid="`year-month-card-${month.month}`"
          @click="openMonthlyDashboard(month.month)"
        >
          <div class="month-card-header">
            <span class="month-card-title">{{ monthLabel(month.month) }}</span>
            <span class="month-card-income">{{ formatCurrencyValue(month.monthlyIncome) }}</span>
          </div>

          <p v-if="!month.hasBudget" class="month-empty">{{ t('dashboard.noBudgetForPeriod') }}</p>

          <div v-else class="month-buckets">
            <div
              v-for="group in groups"
              :key="`month-${month.month}-${group}`"
              class="month-bucket-row"
            >
              <span>{{ t(`groups.${group}`) }}</span>
              <span>{{ formatCurrencyValue(month.buckets[group].spent) }}</span>
            </div>
          </div>
        </button>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { initDatabase } from '@/data/database';
import {
  getBudgetMonth,
  getBudgetYearByYear,
  getCategoriesByGroup,
  getExpensesByYear,
  getLatestBudgetYear,
} from '@/data/repositories';
import { GROUP_ORDER, type Category, type CategoryId, type Expense } from '@/domain/entities';
import { BudgetHero, GroupDisplay } from '@/shared/components/molecules';
import { useCurrency } from '@/shared/composables/useCurrency';
import Button from 'primevue/button';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import SpendTrend, { type TrendRow } from '../components/SpendTrend.vue';
import TopCategories, { type TopCategoryEntry } from '../components/TopCategories.vue';
import { categoryLabeller } from '../utils/categoryLabel';
import { topCategories } from '../utils/insights';
import { buildYearSummary } from '../utils/yearSummary';

const route = useRoute();
const router = useRouter();
const { t, te, tm } = useI18n();
const { formatCurrency: formatCurrencyValue } = useCurrency();
const resolveCategoryLabel = categoryLabeller(t, te);

const groups = GROUP_ORDER;
const activeYear = ref(new Date().getFullYear());
const loading = ref(false);
const hasError = ref(false);
const summary = ref(buildYearSummary([], activeYear.value));
const yearExpenses = ref<Expense[]>([]);
const categoryById = ref(new Map<CategoryId, Category>());

const TOP_CATEGORY_LIMIT = 5;

const trendRows = computed<TrendRow[]>(() =>
  summary.value.months.map((month) => {
    const byGroup = {} as TrendRow['byGroup'];
    let total = 0;
    for (const group of groups) {
      byGroup[group] = month.buckets[group].spent;
      total += byGroup[group];
    }
    return { initial: monthLabel(month.month).charAt(0).toUpperCase(), byGroup, total };
  }),
);

const topEntries = computed<TopCategoryEntry[]>(() =>
  topCategories(yearExpenses.value, TOP_CATEGORY_LIMIT).map((entry) => ({
    label: resolveCategoryLabel(categoryById.value.get(entry.categoryId), entry.categoryId),
    group: entry.group,
    spent: entry.spent,
  })),
);

const monthNames = computed<string[]>(() => {
  const localized = tm('dashboard.monthNames');

  if (!Array.isArray(localized)) {
    return [];
  }

  return localized.map((month) => String(month));
});

const annualIncomePlanned = computed(() => {
  return summary.value.months.reduce((total, month) => total + month.monthlyIncome, 0);
});

const yearProgress = computed(() => {
  const planned = annualIncomePlanned.value;
  if (planned === 0) return 0;
  const spent = summary.value.totalsByGroup.reduce((total, bucket) => total + bucket.spent, 0);
  return Math.round((spent / planned) * 100);
});

function toInteger(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function monthLabel(month: number): string {
  const index = month - 1;
  return monthNames.value[index] ?? String(month);
}

function resolveRouteYear(defaultYear: number): number {
  return toInteger(route.query.year) ?? defaultYear;
}

async function loadYearSummary(year: number): Promise<void> {
  loading.value = true;
  hasError.value = false;

  try {
    const budgetYear = await getBudgetYearByYear(year);
    if (!budgetYear) {
      summary.value = buildYearSummary([], year);
      yearExpenses.value = [];
      return;
    }

    const [months, expenses] = await Promise.all([
      Promise.all(
        Array.from({ length: 12 }, (_, index) => getBudgetMonth(budgetYear.id, index + 1)),
      ),
      getExpensesByYear(budgetYear.id),
    ]);
    summary.value = buildYearSummary(months, year);
    yearExpenses.value = expenses;
  } catch (error) {
    console.error('Failed to load annual summary', { error, year });
    hasError.value = true;
  } finally {
    loading.value = false;
  }
}

function openMonthlyDashboard(month: number): void {
  void router.push({
    name: 'month',
    query: {
      year: String(activeYear.value),
      month: String(month),
    },
  });
}

function changeYear(delta: number): void {
  activeYear.value += delta;
  void loadYearSummary(activeYear.value);
}

async function loadCategories(): Promise<void> {
  const perGroup = await Promise.all(
    groups.map((group) => getCategoriesByGroup(group, { includeInactive: true })),
  );
  categoryById.value = new Map(perGroup.flat().map((category) => [category.id, category]));
}

onMounted(async () => {
  await initDatabase();

  const latestYear = await getLatestBudgetYear();
  activeYear.value = resolveRouteYear(latestYear?.year ?? activeYear.value);

  await Promise.all([loadCategories(), loadYearSummary(activeYear.value)]);
});
</script>

<style scoped>
.year-summary-header {
  margin-bottom: 1rem;
}

.year-summary-header h1 {
  font-size: 1.35rem;
}

.year-switcher {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border: 1.5px solid var(--t-border);
  border-radius: var(--t-r-md);
  background: var(--t-surface);
  box-shadow: var(--t-shadow-hard-sm);
}

.year-label {
  font-weight: 700;
  min-width: 90px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.budget-summary {
  margin-bottom: 1rem;
}

.groups-section {
  margin-bottom: 1rem;
}

.insights-section {
  margin-bottom: 1rem;
}

.insights-heading {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--t-ink-faint);
  margin: 0 0 0.5rem;
}

.insights-empty {
  margin: 0 0 1rem;
  font-size: 0.8rem;
  color: var(--t-ink-faint);
}

.months-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 0.75rem;
}

.month-card {
  width: 100%;
  border: 1.5px solid var(--t-border);
  border-radius: var(--t-r-md);
  background: var(--t-surface);
  box-shadow: var(--t-shadow-hard-sm);
  text-align: left;
  padding: 0.8rem;
}

.month-card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 0.55rem;
}

.month-card-title {
  font-weight: 700;
  font-size: 0.82rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.month-card-income {
  color: var(--t-ink-faint);
  font-size: 0.72rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.month-empty {
  color: var(--t-ink-faint);
  font-size: 0.78rem;
}

.month-buckets {
  display: grid;
  gap: 0.3rem;
}

.month-bucket-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.year-summary-state {
  text-align: center;
  color: var(--t-ink-muted);
  padding: 2rem 0;
}

@media (min-width: 768px) {
  .months-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .months-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
