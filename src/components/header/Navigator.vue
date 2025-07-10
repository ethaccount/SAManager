<script lang="ts" setup>
import { DISABLE_SCHEDULING } from '@/config'
import { toRoute } from '@/lib/router'
import { Menu } from 'lucide-vue-next'

const route = useRoute()

const isOpen = ref(false)

const closeSheet = () => {
	isOpen.value = false
}
</script>

<template>
	<!-- Desktop Navigation -->
	<nav class="hidden sm:flex items-center space-x-6 text-sm font-medium">
		<RouterLink
			:to="toRoute('create')"
			class="transition-colors hover:text-foreground/80 text-foreground/60"
			:class="{
				'text-foreground/80': route.name === 'create',
			}"
		>
			Create
		</RouterLink>

		<RouterLink
			:to="toRoute('send-token')"
			class="transition-colors hover:text-foreground/80 text-foreground/60"
			:class="{
				'text-foreground/80': route.name === 'send-token',
			}"
		>
			Send
		</RouterLink>

		<RouterLink
			v-if="!DISABLE_SCHEDULING"
			:to="toRoute('scheduling-transfer')"
			class="transition-colors hover:text-foreground/80 text-foreground/60"
			:class="{
				'text-foreground/80': route.name === 'scheduling-transfer',
			}"
		>
			Scheduling
		</RouterLink>

		<RouterLink
			:to="toRoute('browser')"
			class="transition-colors hover:text-foreground/80 text-foreground/60"
			:class="{
				'text-foreground/80': route.name === 'browser',
			}"
		>
			Browser
		</RouterLink>
	</nav>

	<!-- Mobile Navigation -->
	<Sheet v-model:open="isOpen">
		<SheetTrigger asChild class="sm:hidden">
			<Button variant="ghost" size="icon">
				<Menu class="h-5 w-5" />
			</Button>
		</SheetTrigger>

		<SheetContent side="top" class="w-full sm:hidden">
			<SheetHeader>
				<SheetTitle></SheetTitle>
				<SheetDescription></SheetDescription>
			</SheetHeader>
			<nav class="flex flex-col gap-4 mt-4">
				<RouterLink
					:to="toRoute('home')"
					class="transition-colors hover:text-foreground/80 text-foreground/60"
					:class="{
						'text-foreground/80': route.name === 'home',
					}"
					@click="closeSheet"
				>
					Home
				</RouterLink>

				<RouterLink
					:to="toRoute('create')"
					class="transition-colors hover:text-foreground/80 text-foreground/60"
					:class="{
						'text-foreground/80': route.name === 'create',
					}"
					@click="closeSheet"
				>
					Create New Account
				</RouterLink>

				<RouterLink
					:to="toRoute('send-token')"
					class="transition-colors hover:text-foreground/80 text-foreground/60"
					:class="{
						'text-foreground/80': route.name === 'send-token',
					}"
					@click="closeSheet"
				>
					Send Token
				</RouterLink>

				<RouterLink
					:to="toRoute('send-raw')"
					class="transition-colors hover:text-foreground/80 text-foreground/60"
					:class="{
						'text-foreground/80': route.name === 'send-raw',
					}"
					@click="closeSheet"
				>
					Send Raw Data
				</RouterLink>

				<RouterLink
					v-if="!DISABLE_SCHEDULING"
					:to="toRoute('scheduling-transfer')"
					class="transition-colors hover:text-foreground/80 text-foreground/60"
					:class="{
						'text-foreground/80': route.name === 'scheduling-transfer',
					}"
					@click="closeSheet"
				>
					Schedule Transfers
				</RouterLink>

				<RouterLink
					v-if="!DISABLE_SCHEDULING"
					:to="toRoute('scheduling-swap')"
					class="transition-colors hover:text-foreground/80 text-foreground/60"
					:class="{
						'text-foreground/80': route.name === 'scheduling-swap',
					}"
					@click="closeSheet"
				>
					Schedule Swaps
				</RouterLink>

				<RouterLink
					v-if="!DISABLE_SCHEDULING"
					:to="toRoute('scheduling-jobs')"
					class="transition-colors hover:text-foreground/80 text-foreground/60"
					:class="{
						'text-foreground/80': route.name === 'scheduling-jobs',
					}"
					@click="closeSheet"
				>
					Scheduled Jobs
				</RouterLink>

				<RouterLink
					:to="toRoute('browser')"
					class="transition-colors hover:text-foreground/80 text-foreground/60"
					:class="{
						'text-foreground/80': route.name === 'browser',
					}"
					@click="closeSheet"
				>
					Browser
				</RouterLink>
			</nav>
		</SheetContent>
	</Sheet>
</template>

<style lang="css" scoped></style>
