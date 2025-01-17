import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/',
			name: 'Home',
			component: () => import('@/views/Home.vue'),
		},
		{
			path: '/send',
			name: 'Send',
			component: () => import('@/views/Send.vue'),
		},
	],
})

export default router
