<script lang="ts" setup>
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useBlockchain } from '@/stores/useBlockchain'
import { Menu } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'

const { chainId } = useBlockchain()
</script>

<template>
	<!-- Desktop Navigation -->
	<nav class="hidden sm:flex items-center space-x-6 text-sm font-medium">
		<RouterLink
			:to="{ name: 'send-token', params: { chainId } }"
			class="transition-colors hover:text-foreground/80 text-foreground/60"
		>
			Send
		</RouterLink>
		<RouterLink
			:to="{ name: 'scheduling-transfer', params: { chainId } }"
			class="transition-colors hover:text-foreground/80 text-foreground/60"
		>
			Scheduling
		</RouterLink>
		<RouterLink
			:to="{ name: 'recovery-setup', params: { chainId } }"
			class="transition-colors hover:text-foreground/80 text-foreground/60"
		>
			Recovery
		</RouterLink>
	</nav>

	<!-- Mobile Navigation -->
	<Sheet>
		<SheetTrigger asChild class="sm:hidden">
			<Button variant="ghost" size="icon">
				<Menu class="h-5 w-5" />
			</Button>
		</SheetTrigger>
		<SheetContent side="top" class="w-full sm:hidden">
			<SheetHeader>
				<SheetTitle>Menu</SheetTitle>
			</SheetHeader>
			<nav class="flex flex-col gap-4 mt-4">
				<RouterLink
					:to="{ name: 'send-token', params: { chainId } }"
					class="transition-colors hover:text-foreground/80 text-foreground/60"
				>
					Send
				</RouterLink>
				<RouterLink
					:to="{ name: 'scheduling-transfer', params: { chainId } }"
					class="transition-colors hover:text-foreground/80 text-foreground/60"
				>
					Scheduling
				</RouterLink>
				<RouterLink
					:to="{ name: 'recovery-setup', params: { chainId } }"
					class="transition-colors hover:text-foreground/80 text-foreground/60"
				>
					Recovery
				</RouterLink>
			</nav>
		</SheetContent>
	</Sheet>
</template>

<style lang="css" scoped></style>
