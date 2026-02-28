<script setup lang="ts">
type BgVariant = 'yellow' | 'blue' | 'green' | 'gray' | 'red';

const props = withDefaults(
  defineProps<{
    initials: string;
    bg?: BgVariant;
  }>(),
  {
    bg: 'yellow',
  },
);

const bgMap: Record<BgVariant, string> = {
  yellow: 'bg-yellow-400',
  blue: 'bg-blue-400',
  green: 'bg-green-400',
  gray: 'bg-gray-300',
  red: 'bg-red-400',
};
</script>

<template>
  <div
    class="h-10 w-10 shrink-0 rounded-full ring-1 ring-border flex items-center justify-center font-semibold text-sm text-foreground"
    :class="bgMap[props?.bg]"
  >
    {{ props?.initials }}
  </div>
</template>

<style scoped></style>
