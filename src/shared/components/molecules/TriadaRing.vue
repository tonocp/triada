<template>
  <div class="triad-ring" :style="{ width: `${size}px`, height: `${size}px` }">
    <div class="triad-ring-fill" :style="{ background: conicGradient }"></div>
    <div class="triad-ring-hole"></div>
    <div class="triad-ring-center">
      <svg
        class="triad-ring-glyph"
        viewBox="0 0 34 30"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M17 3 32 27H2L17 3Z" />
      </svg>
      <span v-if="caption" class="triad-ring-caption">{{ caption }}</span>
      <span v-if="value" class="triad-ring-value">{{ value }}</span>
      <span v-if="sub" class="triad-ring-sub">{{ sub }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GROUP_ORDER, groupShares, type GroupType } from '@/domain/entities';
import { computed } from 'vue';

interface RingBucket {
  group: GroupType;
  allocated: number;
  spent: number;
}

const props = withDefaults(
  defineProps<{
    buckets: RingBucket[];
    size?: number;
    caption?: string;
    value?: string;
    sub?: string;
  }>(),
  { size: 200 },
);

const GAP = 0.6;

const conicGradient = computed(() => {
  const byGroup = new Map(props.buckets.map((b) => [b.group, b]));

  const shares = groupShares(props.buckets);
  const spanFor = (group: GroupType): number => (shares ? shares[group] : 100 / GROUP_ORDER.length);

  let cursor = 0;

  const stops = GROUP_ORDER.flatMap((group, index) => {
    const span = spanFor(group);
    const last = index === GROUP_ORDER.length - 1;
    const bucket = byGroup.get(group);
    const spentFraction =
      bucket && bucket.allocated > 0 ? Math.min(bucket.spent / bucket.allocated, 1) : 0;

    const start = cursor;
    const visibleEnd = start + span - (last ? 0 : GAP);
    const litEnd = start + (visibleEnd - start) * spentFraction;
    cursor += span;

    return [
      `var(--t-${group}) ${start}% ${litEnd}%`,
      `var(--t-${group}-tint) ${litEnd}% ${visibleEnd}%`,
      last ? null : `var(--t-border) ${visibleEnd}% ${cursor}%`,
    ].filter((stop): stop is string => stop !== null);
  });

  return `conic-gradient(from -90deg, ${stops.join(', ')})`;
});
</script>

<style scoped>
.triad-ring {
  position: relative;
  flex-shrink: 0;
}

.triad-ring-fill {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid var(--t-border);
  -webkit-mask: radial-gradient(farthest-side, transparent 74%, #000 75%);
  mask: radial-gradient(farthest-side, transparent 74%, #000 75%);
}

.triad-ring-hole {
  position: absolute;
  inset: 13%;
  border-radius: 50%;
  background: var(--t-surface);
  border: 1.5px solid var(--t-border);
}

.triad-ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  text-align: center;
  padding: 0 12%;
}

.triad-ring-glyph {
  width: 1.15rem;
  height: 1rem;
  color: var(--t-ink);
  margin-bottom: 0.05rem;
}

.triad-ring-caption {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--t-ink-muted);
}

.triad-ring-value {
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.triad-ring-sub {
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--t-ink-muted);
  font-variant-numeric: tabular-nums;
}
</style>
