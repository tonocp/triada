<template>
  <div class="app-banner" role="status">
    <p class="app-banner-text">{{ message }}</p>
    <div class="app-banner-actions">
      <Button
        v-if="actionLabel"
        :label="actionLabel"
        size="small"
        rounded
        @click="$emit('action')"
      />
      <Button
        v-if="dismissible"
        icon="pi pi-times"
        severity="secondary"
        text
        rounded
        size="small"
        :aria-label="dismissLabel"
        @click="$emit('dismiss')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';

defineProps<{
  message: string;
  actionLabel?: string;
  dismissible?: boolean;
  dismissLabel?: string;
}>();

defineEmits<{ action: []; dismiss: [] }>();
</script>

<style scoped>
.app-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.9rem;
  border: 1.5px solid var(--t-border);
  border-radius: var(--t-r-md);
  background: var(--t-surface);
  box-shadow: var(--t-shadow-hard-sm);
}

.app-banner-text {
  flex: 1;
  margin: 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--t-ink);
}

.app-banner-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}
</style>
