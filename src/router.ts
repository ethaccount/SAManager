import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/',
			name: 'Send',
			component: () => import('@/views/Send.vue'),
		},
		{
			path: '/modules',
			name: 'Modules',
			component: () => import('@/views/Modules.vue'),
		},
	],
})

export default router
