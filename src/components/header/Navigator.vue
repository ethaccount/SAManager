<script lang="ts" setup>
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useNetwork } from '@/stores/useNetwork'
import { Menu } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { ref } from 'vue'

const { selectedChainId } = useNetwork()

const isOpen = ref(false)

const closeSheet = () => {
	isOpen.value = false
}
</script>

<template>
	<!-- Desktop Navigation -->
	<nav class="hidden sm:flex items-center space-x-6 text-sm font-medium">
		<RouterLink
			:to="{ name: 'send-token', params: { chainId: selectedChainId } }"
			class="transition-colors hover:text-foreground/80 text-foreground/60"
		>
			Send
		</RouterLink>
		<!-- <RouterLink
			:to="{ name: 'scheduling-transfer', params: { chainId } }"
			class="transition-colors hover:text-foreground/80 text-foreground/60"
			disabled
		>
			Scheduling
		</RouterLink>
		<RouterLink
			:to="{ name: 'recovery-setup', params: { chainId } }"
			class="transition-colors hover:text-foreground/80 text-foreground/60"
			disabled
		>
			Recovery
		</RouterLink> -->
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
					:to="{ name: 'send-token', params: { chainId: selectedChainId } }"
					class="transition-colors hover:text-foreground/80 text-foreground/60"
					@click="closeSheet"
				>
					<Button variant="ghost" class="w-full justify-start">Send</Button>
				</RouterLink>
				<!-- <RouterLink
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
				</RouterLink> -->
			</nav>
		</SheetContent>
	</Sheet>
</template>

<style lang="css" scoped></style>
