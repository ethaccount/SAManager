import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/',
			redirect: '/:chainId',
			children: [
				{
					path: '/:chainId',
					children: [
						// Home
						{
							path: '/:chainId',
							name: 'home',
							component: () => import('@/views/Home.vue'),
						},
						// Create Account
						{
							path: '/:chainId/create',
							name: 'create',
							component: () => import('@/views/UnderConstruction.vue'),
						},
						// Send
						{
							path: '/:chainId/send/token',
							name: 'send-token',
							component: () => import('@/views/UnderConstruction.vue'),
						},
						{
							path: '/:chainId/send/raw',
							name: 'send-raw',
							component: () => import('@/views/UnderConstruction.vue'),
						},
					],
				},
			],
		},
	],
})

export default router
