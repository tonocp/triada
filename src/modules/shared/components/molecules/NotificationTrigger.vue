<script setup lang="ts">
import BadgeCount from '@/modules/shared/components/atoms/BadgeCount.vue';
import IconButton from '@/modules/shared/components/atoms/IconButton.vue';
import type { NotificationSize } from '@/modules/shared/types/notification';

const props = withDefaults(
  defineProps<{
    count: number;
    size?: NotificationSize;
    icon?: string;
    ariaLabel?: string;
  }>(),
  {
    size: 'md',
    icon: 'material-symbols-light:notifications',
    ariaLabel: 'Abrir notificaciones',
  },
);
</script>

<template>
  <div class="relative inline-flex">
    <IconButton :icon="props.icon" :size="props.size" :aria-label="props.ariaLabel" />
    <div class="absolute -top-0.5 -right-0.5">
      <BadgeCount :count="props.count" />
    </div>
  </div>
</template>

<style scoped></style>
