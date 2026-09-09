<template>
  <div class="spend-trend">
    <div class="spend-trend-chart" role="img" :aria-label="t('dashboard.insightsTrend')">
      <div v-for="(row, index) in rows" :key="`trend-${index}`" class="spend-trend-col">
        <div class="spend-trend-track">
          <div class="spend-trend-bar" :style="{ height: `${barHeight(row.total)}%` }">
            <span
              v-for="group in groups"
              :key="`seg-${index}-${group}`"
              class="spend-trend-seg"
              :data-group="group"
              :style="{ height: `${segHeight(row, group)}%` }"
            ></span>
          </div>
        </div>
        <span class="spend-trend-label">{{ row.initial }}</span>
      </div>
    </div>

    <p class="spend-trend-peak">
      {{ t('dashboard.insightsTrendPeak', { amount: formatCurrency(peak) }) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { GROUP_ORDER, type GroupType } from '@/domain/entities';
import { useCurrency } from '@/shared/composables/useCurrency';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

export interface TrendRow {
  initial: string;
  byGroup: Record<GroupType, number>;
  total: number;
}

const props = defineProps<{ rows: TrendRow[] }>();

const { t } = useI18n();
const { formatCurrency } = useCurrency();

const groups = GROUP_ORDER;

const peak = computed(() => props.rows.reduce((max, row) => Math.max(max, row.total), 0));

function barHeight(total: number): number {
  return peak.value > 0 ? (total / peak.value) * 100 : 0;
}

function segHeight(row: TrendRow, group: GroupType): number {
  return row.total > 0 ? (row.byGroup[group] / row.total) * 100 : 0;
}
</script>

<style scoped>
.spend-trend {
  border: 1.5px solid var(--t-border);
  border-radius: var(--t-r-md);
  background: var(--t-surface);
  box-shadow: var(--t-shadow-hard-sm);
  padding: 0.9rem;
}

.spend-trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 0.3rem;
  height: 5.5rem;
}

.spend-trend-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
  height: 100%;
}

.spend-trend-track {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.spend-trend-bar {
  width: 100%;
  max-width: 1.4rem;
  min-height: 2px;
  display: flex;
  flex-direction: column-reverse;
  border: 1.5px solid var(--t-border);
  border-radius: var(--t-r-sm) var(--t-r-sm) 0 0;
  overflow: hidden;
}

.spend-trend-seg {
  width: 100%;
  background: var(--group-color);
}

.spend-trend-label {
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--t-ink-faint);
  font-variant-numeric: tabular-nums;
}

.spend-trend-peak {
  margin: 0.7rem 0 0;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--t-ink-faint);
}
</style>
