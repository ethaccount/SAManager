<script setup lang="ts">
import { OwnableValidatorAPI } from '@/api/OwnableValidatorAPI'
import { Button } from '@/components/ui/button'
import { useLoading } from '@/lib/useLoading'
import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain'
import { Loader2, X } from 'lucide-vue-next'
import { VueFinalModal } from 'vue-final-modal'

const emit = defineEmits<{
	close: []
}>()

const { client } = useBlockchain()
const { selectedAccount } = useAccount()
const {
	data: owners,
	error: errorGetOwners,
	isLoading: isLoadingOwners,
	load: loadOwners,
} = useLoading({
	fn: () => {
		if (!selectedAccount.value) {
			throw new Error('[OwnableValidatorSettingsModal] No selected account')
		}
		return OwnableValidatorAPI.getOwners(client.value, selectedAccount.value.address)
	},
	errorPrefix: 'Error loading owners: ',
})

onMounted(async () => {
	await loadOwners()
})

function onClose() {
	emit('close')
}
</script>

<template>
	<VueFinalModal
		class="ownable-validator-settings-modal"
		content-class="ownable-validator-settings-modal-content"
		overlay-transition="vfm-fade"
		content-transition="vfm-fade"
		:click-to-close="true"
		:esc-to-close="true"
	>
		<!-- header -->
		<div class="flex justify-between items-center">
			<!-- left spacer -->
			<div class="w-9"></div>

			<div>Ownable Validator Settings</div>

			<!-- close button -->
			<div class="w-9">
				<Button variant="ghost" size="icon" @click="onClose">
					<X class="w-4 h-4" />
				</Button>
			</div>
		</div>

		<div class="py-6">
			<div class="space-y-2">
				<div class="text-sm font-medium">Owners</div>
				<div v-if="errorGetOwners" class="text-sm text-destructive">
					{{ errorGetOwners }}
				</div>
				<div v-if="isLoadingOwners" class="flex justify-center items-center">
					<Loader2 class="w-4 h-4 animate-spin" />
				</div>
				<div v-else class="grid gap-3">
					<div
						v-for="owner in owners"
						:key="owner"
						class="py-3 px-4 bg-card border border-border/40 rounded-lg"
					>
						<Address :address="owner" />
					</div>
				</div>
			</div>
		</div>
	</VueFinalModal>
</template>

<style>
.ownable-validator-settings-modal {
	display: flex;
	justify-content: center;
	align-items: center;
}

.ownable-validator-settings-modal-content {
	@apply border border-border bg-background p-6 mx-5;
	width: 420px;
	display: flex;
	flex-direction: column;
	border-radius: 0.5rem;
}
</style>
