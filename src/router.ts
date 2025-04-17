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
						{
							path: '',
							component: () => import('@/views/Send.vue'),
						},
						{
							path: '/:chainId/modules',
							component: () => import('@/views/Modules.vue'),
						},
					],
				},
			],
		},
	],
})

export default router
