import { routes } from '@/router';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';

describe('DashboardPage', () => {
  let pinia = createPinia();
  let router = createRouter({
    history: createMemoryHistory(),
    routes,
  });

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    router = createRouter({
      history: createMemoryHistory(),
      routes,
    });
  });

  it('renders the correct content', async () => {
    await router.push('/');
    await router.isReady();

    const wrapper = mount(RouterView, {
      global: {
        plugins: [pinia, router],
        stubs: {
          // Avoid stubbing RouterView to allow nested routing
          RouterView: false,
        },
      },
    });

    // Wait for all async components to load
    await flushPromises();
    await wrapper.vm.$nextTick();

    // Mejora: En lugar de comparar el HTML string completo,
    // buscamos los elementos específicos que esperamos (los 10 cuadros grises)
    const items = wrapper.findAll('.w-full.bg-gray-200.h-80.rounded-4xl');

    expect(items).toHaveLength(10);

    // Find the dashboard container
    const dashboardContainer = wrapper.find('.flex.flex-col.gap-4.p-4');
    expect(dashboardContainer.exists()).toBe(true);
  });
});
