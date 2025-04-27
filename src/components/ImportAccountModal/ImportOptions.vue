<script setup lang="ts">
import { Card } from '@/components/ui/card'
import { Code, Key, LinkIcon, Wallet, ChevronRight } from 'lucide-vue-next'

type AccountOption = {
	title: string
	description: string
	icon: Component
}

const accountOptions: AccountOption[] = [
	{
		title: 'Passkey',
		description: 'Import an account using your passkey for this site',
		icon: Key,
	},
	{
		title: 'EOA-Owned',
		description: 'Import an account controlled by an EOA in a wallet',
		icon: Wallet,
	},
	{
		title: 'Smart EOAs',
		description: 'Import an EIP-7702 upgraded EOA that has smart account capabilities',
		icon: Code,
	},
	{
		title: 'Address',
		description: 'Import an account by entering your account address',
		icon: LinkIcon,
	},
]

const onClickAccountOption = (option: AccountOption) => {}
</script>

<template>
	<div class="grid gap-4 py-4">
		<Card
			v-for="option in accountOptions"
			:key="option.title"
			class="hover:bg-accent cursor-pointer transition-colors"
			@click="onClickAccountOption(option)"
		>
			<div class="flex items-center gap-4 w-full p-4">
				<div class="bg-primary/10 p-2 rounded-full shrink-0">
					<component :is="option.icon" class="h-5 w-5 text-primary" />
				</div>
				<div class="flex flex-col items-start w-full min-w-0">
					<span class="font-medium truncate w-full">{{ option.title }}</span>
					<span class="text-sm text-muted-foreground break-words w-full">{{ option.description }}</span>
				</div>
				<ChevronRight class="h-5 w-5 text-muted-foreground shrink-0" />
			</div>
		</Card>
	</div>
</template>

<style lang="css" scoped></style>
