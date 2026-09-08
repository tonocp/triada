import { createRouter, createWebHistory } from 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    /**
     * An in-app screen: shows the bottom navigation and requires a budget
     * (redirect to /setup until one exists).
     */
    app?: boolean;
  }
}

export const routes = [
  {
    path: '/',
    name: 'home',
    redirect: '/year',
  },
  {
    path: '/setup',
    name: 'setup',
    component: () => import('@/features/setup/pages/SetupPage.vue'),
  },
  {
    path: '/year',
    name: 'year',
    component: () => import('@/features/dashboard/pages/YearSummaryPage.vue'),
    meta: { app: true },
  },
  {
    path: '/month',
    name: 'month',
    component: () => import('@/features/dashboard/pages/DashboardPage.vue'),
    meta: { app: true },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/features/settings/pages/SettingsPage.vue'),
    meta: { app: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'notfound',
    component: () => import('@/views/NotFoundPage.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
