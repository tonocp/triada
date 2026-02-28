import { createRouter, createWebHistory } from 'vue-router';

export const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/modules/shared/layouts/TopNavLayout.vue'),
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/modules/dashboard/views/pages/DashboardPage.vue'),
      },
    ],
  },
  {
    path: '/bottom-layout',
    name: 'nav-bottom-home',
    component: () => import('@/modules/shared/layouts/BottomNavLayout.vue'),
    children: [
      { path: '', name: 'redirect-home', redirect: '/bottom-layout/home' },
      {
        path: 'home',
        name: 'bottom-home',
        component: () => import('@/modules/dashboard/views/pages/DashboardPage.vue'),
      },
      {
        path: 'search',
        name: 'bottom-search',
        component: () => import('@/modules/dashboard/views/pages/DashboardPage.vue'),
      },
      {
        path: 'add',
        name: 'bottom-add',
        component: () => import('@/modules/dashboard/views/pages/DashboardPage.vue'),
      },
      {
        path: 'notifications',
        name: 'bottom-notifications',
        component: () => import('@/modules/dashboard/views/pages/DashboardPage.vue'),
      },
      {
        path: 'profile',
        name: 'bottom-profile',
        component: () => import('@/modules/dashboard/views/pages/DashboardPage.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'notfound',
    params: { pathMatch: '404' },
    component: () => import('@/modules/shared/views/pages/NotFoundPage.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
