<script setup lang="ts">
import { Card } from '@/components/ui/card'
import { IAMStageKey, useImportAccountModal } from '@/stores/useImportAccountModal'
import { AccountCategory } from '@/stores/account/account'
import { Code, Key, LinkIcon, Wallet, ChevronRight } from 'lucide-vue-next'
import { usePasskey } from '@/stores/passkey/usePasskey'

type AccountOption = {
	title: string
	description: string
	icon: Component
	nextStageKey: IAMStageKey | null
	category: AccountCategory
}

const accountOptions = computed<AccountOption[]>(() => {
	const { isPasskeyRPHealthy } = usePasskey()
	return [
		{
			title: 'Passkey',
			description: 'Import an account using your passkey for this site',
			icon: Key,
			nextStageKey: isPasskeyRPHealthy.value ? IAMStageKey.CONNECT_PASSKEY : null,
			category: 'Smart Account',
		},
		{
			title: 'EOA-Owned',
			description: 'Import an account controlled by an EOA in a wallet',
			icon: Wallet,
			nextStageKey: IAMStageKey.CONNECT_EOA_WALLET,
			category: 'Smart Account',
		},
		{
			title: 'Smart EOA',
			description: 'Import an EIP-7702 upgraded EOA that has smart account capabilities',
			icon: Code,
			nextStageKey: IAMStageKey.CONNECT_SMART_EOA,
			category: 'Smart EOA',
		},
		{
			title: 'Address',
			description: 'Import an account by entering your account address',
			icon: LinkIcon,
			nextStageKey: null,
			category: 'Smart Account',
		},
	]
})

const onClickAccountOption = (option: AccountOption) => {
	const { goNextStage } = useImportAccountModal()

	if (option.nextStageKey) {
		useImportAccountModal().updateFormData({ category: option.category })
		goNextStage(option.nextStageKey)
	}
}
</script>

<template>
	<div class="grid gap-4 py-4">
		<Card
			v-for="option in accountOptions"
			:key="option.title"
			class="hover:bg-accent cursor-pointer transition-colors"
			:class="{
				'opacity-50': option.nextStageKey === null,
				'cursor-default': option.nextStageKey === null,
				'hover:bg-transparent': option.nextStageKey === null,
			}"
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
