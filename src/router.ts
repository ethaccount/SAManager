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
						// Account Management
						{
							path: '/:chainId/:address',
							name: 'account',
							component: () => import('@/views/UnderConstruction.vue'),
						},
						{
							path: '/:chainId/:address/modules',
							name: 'account-modules',
							component: () => import('@/views/UnderConstruction.vue'),
						},
						{
							path: '/:chainId/:address/sessions',
							name: 'account-sessions',
							component: () => import('@/views/UnderConstruction.vue'),
						},
						{
							path: '/:chainId/:address/paymasters',
							name: 'account-paymasters',
							component: () => import('@/views/UnderConstruction.vue'),
						},
						// Send
						{
							path: '/:chainId/send/token',
							name: 'send-token',
							component: () => import('@/views/SendToken.vue'),
						},
						{
							path: '/:chainId/send/raw',
							name: 'send-raw',
							component: () => import('@/views/SendRaw.vue'),
						},
						// Scheduling
						{
							path: '/:chainId/scheduling/transfer',
							name: 'scheduling-transfer',
							component: () => import('@/views/UnderConstruction.vue'),
						},
						{
							path: '/:chainId/scheduling/swap',
							name: 'scheduling-swap',
							component: () => import('@/views/UnderConstruction.vue'),
						},
						{
							path: '/:chainId/scheduling/jobs',
							name: 'scheduling-jobs',
							component: () => import('@/views/UnderConstruction.vue'),
						},
						// Recovery
						{
							path: '/:chainId/recovery/setup',
							name: 'recovery-setup',
							component: () => import('@/views/UnderConstruction.vue'),
						},
						{
							path: '/:chainId/recovery/recover',
							name: 'recovery-recover',
							component: () => import('@/views/UnderConstruction.vue'),
						},
					],
				},
			],
		},
	],
})

export default router
