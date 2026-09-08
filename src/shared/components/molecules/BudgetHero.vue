<template>
  <div class="budget-hero">
    <div class="budget-hero-head">
      <span class="budget-hero-label">{{ label }}</span>
      <slot name="action" />
    </div>
    <span class="budget-hero-income">{{ formatCurrencyValue(income) }}</span>

    <TriadaRing
      :buckets="buckets"
      :size="ringSize"
      :caption="ringCaption"
      :value="ringValue"
      :sub="ringSub"
      class="budget-hero-ring"
    />

    <div class="budget-hero-legend">
      <div
        v-for="bucket in buckets"
        :key="`legend-${bucket.group}`"
        class="budget-hero-legend-row"
        :data-group="bucket.group"
      >
        <span class="budget-hero-legend-dot"></span>
        <span class="budget-hero-legend-name">
          {{ t(`groups.${bucket.group}`) }}
          <span class="budget-hero-legend-pct">· {{ GROUP_PERCENTAGES[bucket.group] }}%</span>
        </span>
        <span class="budget-hero-legend-amount">
          {{ formatCurrencyValue(bucket.spent)
          }}<template v-if="showAllocated"> / {{ formatCurrencyValue(bucket.allocated) }}</template>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GROUP_PERCENTAGES, type GroupType } from '@/domain/entities';
import { useCurrency } from '@/shared/composables/useCurrency';
import { useI18n } from 'vue-i18n';
import TriadaRing from './TriadaRing.vue';

interface HeroBucket {
  group: GroupType;
  spent: number;
  allocated: number;
}

withDefaults(
  defineProps<{
    label: string;
    income: number;
    buckets: HeroBucket[];
    ringCaption: string;
    ringValue: string;
    ringSub?: string;
    ringSize?: number;
    showAllocated?: boolean;
  }>(),
  { ringSize: 196 },
);

const { t } = useI18n();
const { formatCurrency: formatCurrencyValue } = useCurrency();
</script>

<style scoped>
.budget-hero {
  background: var(--t-surface);
  border: 1.5px solid var(--t-border);
  border-radius: var(--t-r-lg);
  box-shadow: var(--t-shadow-hard);
  padding: 1rem;
}

.budget-hero-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.budget-hero-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--t-ink-faint);
}

.budget-hero-income {
  display: block;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  margin-bottom: 0.85rem;
}

.budget-hero-ring {
  display: block;
  margin: 0 auto 0.4rem;
}

.budget-hero-legend {
  margin-top: 0.5rem;
}

.budget-hero-legend-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.1rem;
  font-size: 0.78rem;
}

.budget-hero-legend-row + .budget-hero-legend-row {
  border-top: 1.5px solid var(--t-hairline);
}

.budget-hero-legend-dot {
  width: 0.6rem;
  height: 0.6rem;
  border: 1.5px solid var(--t-border);
  background: var(--group-color);
  flex-shrink: 0;
}

.budget-hero-legend-name {
  flex: 1;
  font-weight: 600;
}

.budget-hero-legend-pct {
  color: var(--t-ink-faint);
  font-weight: 500;
}

.budget-hero-legend-amount {
  color: var(--t-ink-muted);
  font-variant-numeric: tabular-nums;
}
</style>
