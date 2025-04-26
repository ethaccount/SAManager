<script setup lang="ts">
import { Card } from '@/components/ui/card'
import { Code, Key, LinkIcon, Wallet } from 'lucide-vue-next'

type AccountOption = {
	title: string
	description: string
	icon: Component
}

const accountOptions: AccountOption[] = [
	{
		title: 'EOA Wallet',
		description: 'Import your account by connecting a traditional cryptocurrency wallet',
		icon: Wallet,
	},
	{
		title: 'Passkey',
		description: 'Import your account using your passkey for this site',
		icon: Key,
	},
	{
		title: 'EIP-7702',
		description: 'Import your EIP-7702 upgraded account by connecting your cryptocurrency wallet',
		icon: Code,
	},
	{
		title: 'Address',
		description: 'Import your account by entering your account address and choose verification method',
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
			</div>
		</Card>
	</div>
</template>

<style lang="css" scoped></style>
