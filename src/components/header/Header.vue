<script lang="ts" setup>
import { toRoute } from '@/lib/router'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
import { RouterLink } from 'vue-router'

const breakpoints = useBreakpoints(breakpointsTailwind)
</script>

<template>
	<header
		class="fixed top-0 left-0 right-0 z-50 h-[156px] -translate-y-[100px] flex items-end bg-background border-b px-4 lg:px-6"
	>
		<div class="h-[56px] flex w-full max-w-6xl mx-auto justify-between items-center">
			<div class="flex items-center gap-2 sm:gap-6">
				<!-- SAManager -->
				<RouterLink :to="toRoute('home')" class="flex items-center gap-2">
					<div class="font-semibold text-lg" :class="{ 'text-md': breakpoints.isSmaller('sm') }">
						SAManager
					</div>
				</RouterLink>

				<Navigator />
			</div>

			<div class="flex items-center gap-2 sm:gap-4" :class="{ 'gap-3': breakpoints.isSmaller('sm') }">
				<NetworkSelector />
				<AccountButton />
			</div>
		</div>
	</header>
</template>

<style lang="css" scoped></style>
