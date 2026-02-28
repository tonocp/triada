<template>
  <div class="page-container">
    <h1 class="text-2xl font-bold mb-4">Welcome to Your App</h1>

    <Card class="mb-4">
      <template #title>Getting Started</template>
      <template #content>
        <p class="mb-3">This is a PrimeVue boilerplate for your hybrid mobile app.</p>
        <p>Edit this page to start building your app!</p>
      </template>
    </Card>

    <div class="mb-4">
      <label class="block mb-2 font-medium">Example Input</label>
      <InputText v-model="inputValue" placeholder="Type something..." class="w-full" />
    </div>

    <div class="flex gap-2 mb-4 flex-wrap">
      <Button label="Primary" icon="pi pi-check" />
      <Button label="Secondary" icon="pi pi-star" severity="secondary" />
      <Button label="Success" icon="pi pi-check" severity="success" />
      <Button label="Danger" icon="pi pi-times" severity="danger" />
    </div>

    <div class="mb-4">
      <Button label="Show Toast" icon="pi pi-bell" @click="showToast" />
    </div>

    <Card>
      <template #title>Quick Actions</template>
      <template #content>
        <div class="flex flex-col gap-2">
          <Button label="Open Dialog" icon="pi pi-external-link" outlined @click="visible = true" />
        </div>
      </template>
    </Card>

    <Dialog v-model:visible="visible" modal header="Example Dialog" :style="{ width: '90vw' }">
      <p>This is a PrimeVue Dialog component.</p>
      <template #footer>
        <Button label="Close" icon="pi pi-times" severity="secondary" @click="visible = false" />
        <Button label="Confirm" icon="pi pi-check" @click="visible = false" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';

const toast = useToast();
const inputValue = ref('');
const visible = ref(false);

const showToast = () => {
  toast.add({
    severity: 'info',
    summary: 'Hello!',
    detail: 'This is a PrimeVue Toast notification',
    life: 3000,
  });
};
</script>

<style scoped>
.mb-2 {
  margin-bottom: 0.5rem;
}
.mb-3 {
  margin-bottom: 0.75rem;
}
.mb-4 {
  margin-bottom: 1rem;
}
.text-2xl {
  font-size: 1.5rem;
}
.font-bold {
  font-weight: 700;
}
.font-medium {
  font-weight: 500;
}
.flex {
  display: flex;
}
.flex-col {
  flex-direction: column;
}
.gap-2 {
  gap: 0.5rem;
}
.flex-wrap {
  flex-wrap: wrap;
}
.w-full {
  width: 100%;
}
.block {
  display: block;
}
</style>
