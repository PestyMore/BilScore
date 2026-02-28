// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes:[
    { path: '/', name: 'Home', component: HomeView },
    // 移除 PlayerCountView，直接去选人
    { path: '/select-players', name: 'PlayerSelect', component: () => import('../views/PlayerSelectView.vue') },
    { path: '/game', name: 'Game', component: () => import('../views/GameView.vue') },
    
    { path: '/events', name: 'EventList', component: () => import('../views/events/EventListView.vue') },
    { path: '/events/new', name: 'EventCreate', component: () => import('../views/events/EventCreateView.vue') },
    { path: '/events/:id', name: 'EventDetail', component: () => import('../views/events/EventDetailView.vue') },
    
    { path: '/players', name: 'PlayerList', component: () => import('../views/players/PlayerListView.vue') },
    { path: '/players/new', name: 'PlayerCreate', component: () => import('../views/players/PlayerCreateView.vue') },
  ]
});

export default router;
