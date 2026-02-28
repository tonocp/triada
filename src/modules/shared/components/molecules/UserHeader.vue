<script setup lang="ts">
import AvatarInitials from '@/modules/shared/components/molecules/AvatarInitials.vue';

const props = defineProps<{
  name: string;
  email: string;
  initials: string;
}>();
</script>

<template>
  <div class="w-full flex items-center gap-3 rounded-xl bg-card ring-1 ring-border shadow-sm p-3">
    <AvatarInitials :initials="props.initials" />
    <div class="min-w-0">
      <p class="font-semibold text-foreground leading-tight truncate">
        {{ props.name }}
      </p>
      <p class="text-xs text-muted-foreground truncate">{{ props.email }}</p>
    </div>
  </div>
</template>

<style scoped></style>
