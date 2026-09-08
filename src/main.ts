import '@fontsource-variable/space-grotesk/index.css';

import { Capacitor } from '@capacitor/core';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { createPinia } from 'pinia';
import 'primeicons/primeicons.css';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import { registerSW } from 'virtual:pwa-register';
import { createApp } from 'vue';
import App from './App.vue';
import './assets/groups.css';
import './assets/primevue-variables.css';
import './assets/style.css';
import './assets/tokens.css';
import { initDatabase } from './data/database';
import { budgetExists } from './data/repositories';
import router from './router';
import { getLocale, i18n, onLocaleChange } from './shared/i18n';
import { getPrimeVueLocale } from './shared/i18n/primevueLocale';

/**
 * TRIADA preset: Aura with the primary ramp swapped to the brand indigo. This
 * is the single source for the brand hue — `tokens.css` aliases `--t-needs` /
 * `--t-accent` to the `--p-primary-500` this emits. Keeping it in the preset
 * means PrimeVue's own components render on-brand without per-token
 * `!important` overrides in CSS.
 *
 * Aura's `colorScheme.light.primary` already maps to `{primary.*}`, so
 * overriding the ramp is enough; only `highlight` needs a nudge (one step
 * darker than the default 50/100 for more contrast on the paper surface).
 */
const TriadaPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eef0fe',
      100: '#e0e2fc',
      200: '#c4c6f8',
      300: '#a0a0f2',
      400: '#7d76ea',
      500: '#4b45e0',
      600: '#3f39c4',
      700: '#332ea0',
      800: '#29267f',
      900: '#221f66',
      950: '#16133f',
    },
    colorScheme: {
      light: {
        highlight: {
          background: '{primary.100}',
          focusBackground: '{primary.200}',
        },
      },
    },
  },
});

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(router);
app.use(i18n);
app.use(PrimeVue, {
  theme: {
    preset: TriadaPreset,
    options: {
      darkModeSelector: '.dark',
    },
  },
  locale: getPrimeVueLocale(getLocale()),
});
app.use(ToastService);

onLocaleChange((locale) => {
  const primeVue = app.config.globalProperties.$primevue as
    | { config?: { locale?: unknown } }
    | undefined;

  if (primeVue?.config) {
    primeVue.config.locale = getPrimeVueLocale(locale);
  }
});

// First-run guard: in-app routes bounce to /setup until a budget exists;
// /setup bounces to /year once one does.
router.beforeEach(async (to) => {
  const guarded = to.meta.app === true || to.name === 'setup';
  if (!guarded) {
    return;
  }

  await initDatabase();
  const hasBudget = await budgetExists();

  if (to.name === 'setup') {
    return hasBudget ? { name: 'year' } : undefined;
  }
  return hasBudget ? undefined : { name: 'setup' };
});

app.mount('#app');

if (Capacitor.getPlatform() === 'web') {
  void registerSW({ immediate: true });
}
