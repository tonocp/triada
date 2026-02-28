<script setup lang="ts">
import StatusDot from '@/modules/shared/components/atoms/StatusDot.vue';
import type { NotificationItem } from '@/modules/shared/types/notification';
import { Icon } from '@iconify/vue';
import { RouterLink } from 'vue-router';

const props = defineProps<{
  item: NotificationItem;
}>();
</script>

<template>
  <component
    :is="props.item.to ? RouterLink : 'div'"
    :to="props.item.to"
    class="group flex items-start gap-3 rounded-xl bg-card ring-1 ring-border shadow-sm px-3 py-2 text-sm text-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
  >
    <div class="relative">
      <Icon
        :icon="props.item.icon || 'material-symbols-light:notifications'"
        class="text-2xl text-muted-foreground group-hover:text-foreground transition-colors"
      />
      <StatusDot v-if="props.item.read === false" class="absolute -top-0.5 -right-0.5" />
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex items-center justify-between gap-2">
        <span class="font-medium truncate">{{ props.item.title }}</span>
        <span v-if="props.item.time" class="text-xs text-muted-foreground shrink-0">{{
          props.item.time
        }}</span>
      </div>
      <p v-if="props.item.message" class="text-muted-foreground line-clamp-2">
        {{ props.item.message }}
      </p>
    </div>
  </component>
</template>

<style scoped></style>
