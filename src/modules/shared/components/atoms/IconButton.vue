<script setup lang="ts">
import type { NotificationSize } from '@/modules/shared/types/notification';
import { Icon } from '@iconify/vue';

const props = withDefaults(
  defineProps<{
    icon: string;
    size?: NotificationSize;
    ariaLabel?: string;
  }>(),
  {
    size: 'md',
  },
);

const sizeClasses: Record<NotificationSize, string> = {
  sm: 'h-8 w-8 text-[18px]',
  md: 'h-9 w-9 text-[22px]',
  lg: 'h-10 w-10 text-[24px]',
};
</script>

<template>
  <button
    type="button"
    :aria-label="props.ariaLabel || 'Icon button'"
    class="inline-flex items-center justify-center rounded-full bg-card ring-1 ring-border shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
    :class="sizeClasses[props.size]"
  >
    <Icon :icon="props.icon" class="shrink-0" />
  </button>
</template>

<style scoped></style>
