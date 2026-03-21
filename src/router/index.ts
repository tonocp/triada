import { createRouter, createWebHistory } from 'vue-router';

export const routes = [
  {
    path: '/',
    name: 'home',
    redirect: '/setup',
  },
  {
    path: '/setup',
    name: 'setup',
    component: () => import('@/features/setup/pages/SetupPage.vue'),
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/features/dashboard/pages/DashboardPage.vue'),
  },
  {
    path: '/dashboard/year',
    name: 'year-summary',
    component: () => import('@/features/dashboard/pages/YearSummaryPage.vue'),
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
