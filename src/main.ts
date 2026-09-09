import '@fontsource-variable/space-grotesk/index.css';

import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { createPinia } from 'pinia';
import 'primeicons/primeicons.css';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
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

function renderStorageError(): void {
  const root = document.querySelector('#app');
  if (!root) {
    return;
  }

  root.innerHTML = `<main style="max-width:26rem;margin:15vh auto;padding:0 1.5rem;text-align:center;font-family:system-ui,sans-serif">
  <h1 style="font-size:1.2rem;margin-bottom:0.75rem">${i18n.global.t('app.storageError.title')}</h1>
  <p style="line-height:1.55;color:#555">${i18n.global.t('app.storageError.body')}</p>
</main>`;
}

async function bootstrap(): Promise<void> {
  const storageReady = initDatabase().then(() => budgetExists());

  const app = createApp(App);
  app.use(createPinia());
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

  let budgetConfirmed: boolean;
  try {
    budgetConfirmed = await storageReady;
  } catch {
    renderStorageError();
    return;
  }

  router.beforeEach(async (to) => {
    const guarded = to.meta.app === true || to.name === 'setup';
    if (!guarded) {
      return;
    }

    if (!budgetConfirmed) {
      budgetConfirmed = await budgetExists();
    }

    if (to.name === 'setup') {
      return budgetConfirmed ? { name: 'year' } : undefined;
    }
    return budgetConfirmed ? undefined : { name: 'setup' };
  });

  app.mount('#app');
}

void bootstrap();
