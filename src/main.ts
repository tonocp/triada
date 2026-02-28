import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import './assets/style.css';
import router from './router';

const pinia = createPinia();
const app = createApp(App);

router.beforeEach(async (_to, _from, next) => {
  // TODO: Implement authentication and authorization logic here, if needed in the future.
  next();
});

app.use(router);
app.use(pinia);

app.mount('#app');
