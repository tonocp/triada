<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    show?: boolean;
    colorClass?: string;
    ringClass?: string;
    sizeClass?: string;
  }>(),
  {
    show: true,
    colorClass: 'bg-primary',
    ringClass: 'ring-card',
    sizeClass: 'h-2 w-2',
  },
);
</script>

<template>
  <span
    v-if="props.show"
    class="rounded-full ring-2 inline-block"
    :class="[props.colorClass, props.ringClass, props.sizeClass]"
  />
</template>

<style scoped></style>
