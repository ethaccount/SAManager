import { createRouter, createWebHistory } from 'vue-router'
import { IS_SCHEDULED_SWAP_DISABLED } from './config'

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
						// Test
						{
							path: '/:chainId/test',
							children: [
								{
									path: '/:chainId/test/test',
									component: () => import('@/views/test/Test.vue'),
								},
								{
									path: '/:chainId/test/connect',
									component: () => import('@/views/test/Connect.vue'),
								},
								{
									path: '/:chainId/test/chain-icons',
									component: () => import('@/views/test/chain-icons.vue'),
								},
							],
						},
						// Settings
						{
							path: '/:chainId/settings',
							name: 'settings',
							component: () => import('@/views/AppSettings.vue'),
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
							name: 'account-management',
							component: () => import('@/views/AccountManagement/AccountManagement.vue'),
							redirect: to => `${to.path}/modules`,
							children: [
								{
									path: 'modules',
									name: 'account-modules',
									component: () => import('@/views/AccountManagement/AMModules.vue'),
								},
								{
									path: 'permissions',
									name: 'account-permissions',
									component: () => import('@/views/AccountManagement/AMPermissions.vue'),
								},
							],
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
							component: () => import('@/views/ScheduleTransfer.vue'),
						},
						...(IS_SCHEDULED_SWAP_DISABLED
							? []
							: [
									{
										path: '/:chainId/scheduling/swap',
										name: 'scheduling-swap',
										component: () => import('@/views/ScheduleSwap.vue'),
									},
								]),
						{
							path: '/:chainId/scheduling/jobs',
							name: 'scheduling-jobs',
							component: () => import('@/views/ScheduledJobs.vue'),
						},
						// Browser
						{
							path: '/:chainId/browser',
							name: 'browser',
							component: () => import('@/views/Browser.vue'),
						},
					],
				},
			],
		},
	],
})

export default router
