<template>
  <Card :class="cardClass">
    <template #title>
      <slot name="title" />
    </template>
    <template #subtitle>
      <slot name="subtitle" />
    </template>
    <template #content>
      <slot name="content" />
    </template>
    <template #footer>
      <slot name="footer" />
    </template>
  </Card>
</template>

<script setup lang="ts">
import Card from 'primevue/card';

defineProps<{
  cardClass?: string;
}>();
</script>
