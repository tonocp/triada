<template>
  <div class="page-container">
    <div class="text-center">
      <h1 class="text-4xl font-bold mb-4">404</h1>
      <p class="mb-4">Page not found</p>
      <Button label="Go Home" icon="pi pi-home" @click="router.push('/')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<style scoped>
.text-center {
  text-align: center;
}
.text-4xl {
  font-size: 2.25rem;
}
.font-bold {
  font-weight: 700;
}
.mb-4 {
  margin-bottom: 1rem;
}
</style>
