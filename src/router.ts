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
							path: '',
							name: 'home',
							component: () => import('@/views/Home.vue'),
						},

						// Create Account
						{
							path: '/:chainId/create',
							name: 'create',
							component: () => import('@/views/UnderConstruction.vue'),
						},

						// Account Management
						{
							path: '/:address',
							name: 'account',
							component: () => import('@/views/UnderConstruction.vue'),
						},
						{
							path: '/:address/modules',
							name: 'account-modules',
							component: () => import('@/views/UnderConstruction.vue'),
						},
						{
							path: '/:address/sessions',
							name: 'account-sessions',
							component: () => import('@/views/UnderConstruction.vue'),
						},
						{
							path: '/:address/paymasters',
							name: 'account-paymasters',
							component: () => import('@/views/UnderConstruction.vue'),
						},
						// Send
						{
							path: '/send/token',
							name: 'send/token',
							component: () => import('@/views/UnderConstruction.vue'),
						},
						{
							path: '/send/raw',
							name: 'send/raw',
							component: () => import('@/views/UnderConstruction.vue'),
						},
						// Scheduling
						{
							path: '/scheduling/transfer',
							name: 'scheduling/transfer',
							component: () => import('@/views/UnderConstruction.vue'),
						},
						// Recovery
						{
							path: '/recovery/setup',
							name: 'recovery/setup',
							component: () => import('@/views/UnderConstruction.vue'),
						},
					],
				},
			],
		},
	],
})

export default router
