<template>
  <Button
    :label="label"
    :icon="icon"
    :severity="severity"
    :outlined="outlined"
    :loading="loading"
    :disabled="disabled"
    :class="buttonClass"
    @click="$emit('click', $event)"
  />
</template>

<script setup lang="ts">
import Button from 'primevue/button';

defineProps<{
  label?: string;
  icon?: string;
  severity?: 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'help' | 'contrast';
  outlined?: boolean;
  loading?: boolean;
  disabled?: boolean;
  buttonClass?: string;
}>();

defineEmits<{
  click: [event: MouseEvent];
}>();
</script>
