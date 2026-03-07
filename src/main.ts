import { Capacitor } from '@capacitor/core';
import Aura from '@primeuix/themes/aura';
import { createPinia } from 'pinia';
import 'primeicons/primeicons.css';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import { registerSW } from 'virtual:pwa-register';
import { createApp } from 'vue';
import App from './App.vue';
import './assets/primevue-variables.css';
import './assets/style.css';
import router from './router';
import { getLocale, i18n, onLocaleChange } from './shared/i18n';
import { getPrimeVueLocale } from './shared/i18n/primevueLocale';

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(router);
app.use(i18n);
app.use(PrimeVue, {
  theme: {
    preset: Aura,
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

router.beforeEach(async (_to, _from, next) => {
  next();
});

app.mount('#app');

if (Capacitor.getPlatform() === 'web') {
  void registerSW({ immediate: true });
}
