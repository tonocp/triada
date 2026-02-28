<script setup lang="ts">
import { computed } from 'vue';
const props = withDefaults(
  defineProps<{
    count: number;
    max?: number;
    showZero?: boolean;
    colorClass?: string;
    ringClass?: string;
  }>(),
  {
    max: 99,
    showZero: false,
    colorClass: 'bg-red-500 text-white',
    ringClass: 'ring-background',
  },
);

const displayCount = computed(() => {
  const max = Number(props.max ?? 99);
  return props.count > max ? `${max}+` : String(props.count);
});
</script>

<template>
  <span
    v-if="props.showZero || props.count > 0"
    class="min-w-[18px] h-[18px] px-1 rounded-full text-[11px] leading-[18px] text-center ring-2"
    :class="[props.colorClass, props.ringClass]"
  >
    {{ displayCount }}
  </span>
</template>

<style scoped></style>
