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
						// Playground
						{
							path: '/:chainId/test',
							children: [
								{
									path: '/:chainId/test/playground',
									component: () => import('@/views/test/Playground.vue'),
								},
								{
									path: '/:chainId/test/connect',
									component: () => import('@/views/test/Connect.vue'),
								},
							],
						},
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
							component: () => import('@/views/Create.vue'),
						},
						// Account Management
						{
							path: '/:chainId/:address',
							name: 'account-settings',
							component: () => import('@/views/AccountSettings.vue'),
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
