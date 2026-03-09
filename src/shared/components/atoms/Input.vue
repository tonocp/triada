<template>
  <InputText
    :id="id"
    :type="type"
    :inputmode="inputmode"
    :model-value="String(modelValue || '')"
    :placeholder="placeholder"
    :disabled="disabled"
    :class="inputClass"
    @update:model-value="onInput"
  />
</template>

<script setup lang="ts">
import InputText from 'primevue/inputtext';

defineProps<{
  id?: string;
  type?: string;
  inputmode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  modelValue?: string | number;
  placeholder?: string;
  disabled?: boolean;
  inputClass?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

function onInput(value: string | undefined): void {
  emit('update:modelValue', value ?? '');
}
</script>
