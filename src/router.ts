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
						...(import.meta.env.PROD
							? []
							: [
									{
										path: '/:chainId/test',
										children: [
											{
												path: '/:chainId/test/test',
												component: () => import('@/views/test/Test.vue'),
											},
											{
												path: '/:chainId/test/connect-wallet',
												component: () => import('@/views/test/TestConnectWallet.vue'),
											},
											{
												path: '/:chainId/test/chain-icons',
												component: () => import('@/views/test/TestChainIcons.vue'),
											},
											{
												path: '/:chainId/test/modal',
												component: () => import('@/views/test/TestModal.vue'),
											},
											{
												path: '/:chainId/test/toast',
												component: () => import('@/views/test/TestToast.vue'),
											},
										],
									},
								]),
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
						// Connect
						{
							path: '/:chainId/connect',
							name: 'connect',
							component: () => import('@/views/Connect.vue'),
						},
						{
							path: '/:chainId/connect/create',
							name: 'connect-create',
							component: () => import('@/views/ConnectCreate.vue'),
						},
						// Account Settings
						{
							path: '/:chainId/:address',
							name: 'account-settings',
							component: () => import('@/views/AccountSettings/AccountSettings.vue'),
							redirect: to => `${to.path}/modules`,
							children: [
								{
									path: 'modules',
									name: 'account-settings-modules',
									component: () => import('@/views/AccountSettings/AccountModules.vue'),
								},
								{
									path: 'permissions',
									name: 'account-settings-permissions',
									component: () => import('@/views/AccountSettings/AccountPermissions.vue'),
								},
								{
									path: 'multichain',
									name: 'account-settings-multichain',
									component: () => import('@/views/AccountSettings/AccountMultichain.vue'),
								},
								{
									path: 'email-recovery',
									name: 'account-settings-email-recovery',
									component: () => import('@/views/AccountSettings/AccountEmailRecovery.vue'),
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
