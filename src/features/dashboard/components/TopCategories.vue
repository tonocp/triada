<template>
  <ol class="top-categories">
    <li
      v-for="(entry, index) in entries"
      :key="`top-cat-${index}`"
      class="top-cat-row"
      :data-group="entry.group"
    >
      <span class="top-cat-rank">{{ index + 1 }}</span>
      <span class="top-cat-name">{{ entry.label }}</span>
      <span class="top-cat-track">
        <span class="top-cat-bar" :style="{ width: `${width(entry.spent)}%` }"></span>
      </span>
      <span class="top-cat-amount">{{ formatCurrency(entry.spent) }}</span>
    </li>
  </ol>
</template>

<script setup lang="ts">
import type { GroupType } from '@/domain/entities';
import { useCurrency } from '@/shared/composables/useCurrency';

export interface TopCategoryEntry {
  label: string;
  group: GroupType;
  spent: number;
}

const props = defineProps<{ entries: TopCategoryEntry[] }>();

const { formatCurrency } = useCurrency();

function width(spent: number): number {
  const max = props.entries[0]?.spent ?? 0;
  return max > 0 ? (spent / max) * 100 : 0;
}
</script>

<style scoped>
.top-categories {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1.5px solid var(--t-border);
  border-radius: var(--t-r-md);
  background: var(--t-surface);
  box-shadow: var(--t-shadow-hard-sm);
  overflow: hidden;
}

.top-cat-row {
  display: grid;
  grid-template-columns: 1.2rem minmax(4rem, 1fr) minmax(3rem, 5rem) auto;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.8rem;
}

.top-cat-row + .top-cat-row {
  border-top: 1.5px solid var(--t-hairline);
}

.top-cat-rank {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--t-ink-faint);
  font-variant-numeric: tabular-nums;
}

.top-cat-name {
  font-size: 0.82rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top-cat-track {
  height: 0.45rem;
  border: 1.5px solid var(--t-border);
  border-radius: var(--t-r-pill);
  background: var(--t-bg);
  overflow: hidden;
}

.top-cat-bar {
  display: block;
  height: 100%;
  background: var(--group-color);
}

.top-cat-amount {
  font-size: 0.8rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
</style>
