<script setup lang="ts">
import BadgeCount from '@/modules/shared/components/atoms/BadgeCount.vue';
import { Icon } from '@iconify/vue';
import { RouterLink } from 'vue-router';

const props = withDefaults(
  defineProps<{
    to: string;
    icon: string;
    label: string;
    badgeCount?: number;
    exact?: boolean;
  }>(),
  {
    exact: false,
  },
);
</script>

<template>
  <RouterLink :to="props.to" class="flex-1" :aria-label="props.label" v-slot="{ isActive }">
    <span
      class="relative flex flex-col items-center justify-center gap-1 py-1.5 text-xs hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      :class="isActive ? 'text-primary' : 'text-muted-foreground'"
      :aria-current="isActive ? 'page' : undefined"
    >
      <span class="relative inline-flex">
        <Icon :icon="props.icon" class="text-[22px]" />
        <span class="absolute -top-1 -right-2" v-if="props.badgeCount !== undefined">
          <BadgeCount :count="props.badgeCount" />
        </span>
      </span>
      <span class="leading-none">{{ props.label }}</span>
    </span>
  </RouterLink>
</template>

<style scoped></style>
