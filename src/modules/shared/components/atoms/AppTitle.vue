<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    text?: string;
    as?: 'h1' | 'h2' | 'div';
  }>(),
  {
    as: 'h1',
  },
);
</script>

<template>
  <component :is="as" class="text-base font-semibold text-foreground">
    <span
      class="inline-flex items-center rounded-full bg-muted/50 ring-1 ring-border shadow-sm px-3 py-1"
    >
      <slot>
        {{ props.text || 'Título' }}
      </slot>
    </span>
  </component>
</template>

<style scoped></style>
