<script setup lang="ts">
import { OwnableValidatorAPI } from '@/api/OwnableValidatorAPI'
import { Button } from '@/components/ui/button'
import Input from '@/components/ui/input/Input.vue'
import { getErrorMessage } from '@/lib/error'
import { useLoading } from '@/lib/useLoading'
import { deserializeValidationMethod, OwnableValidatorVMethod } from '@/lib/validations'
import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain'
import { TxModalExecution, useTxModal } from '@/stores/useTxModal'
import { shortenAddress } from '@vue-dapp/core'
import { isAddress } from 'ethers'
import { Loader2, Trash2, X } from 'lucide-vue-next'
import { ADDRESS } from 'sendop'
import { VueFinalModal } from 'vue-final-modal'
import { toast } from 'vue-sonner'

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
	updateOwnableValidatorVMethodAddresses()
})

function updateOwnableValidatorVMethodAddresses() {
	if (owners.value) {
		if (!selectedAccount.value) {
			throw new Error('[updateOwnableValidatorVMethodAddresses] No selected account')
		}

		for (let i = 0; i < selectedAccount.value.vMethods.length; i++) {
			const vMethodData = selectedAccount.value.vMethods[i]
			if (vMethodData.name === 'OwnableValidator') {
				const vMethod = deserializeValidationMethod(vMethodData) as OwnableValidatorVMethod
				vMethod.addresses = owners.value || []
				selectedAccount.value.vMethods[i] = vMethod.serialize()
			}
		}
	}
}

function onClose() {
	emit('close')
}

const newOwnerAddress = ref<string>('')

const loadingRemoveOwners = ref<Set<string>>(new Set())
async function onClickRemoveOwner(_ownerAddress: string) {
	if (!selectedAccount.value) {
		throw new Error('[OwnableValidatorSettingsModal#onClickRemoveOwner] No selected account')
	}

	try {
		loadingRemoveOwners.value.add(_ownerAddress)
		const execution: TxModalExecution = {
			description: `Remove owner ${shortenAddress(_ownerAddress)}`,
			to: ADDRESS.OwnableValidator,
			data: await OwnableValidatorAPI.encodeRemoveOwner(
				client.value,
				selectedAccount.value!.address,
				_ownerAddress,
			),
			value: 0n,
		}
		useTxModal().openModal({
			executions: [execution],
			onSuccess: async () => {
				toast.success('Owner removed successfully')
				await loadOwners()
				updateOwnableValidatorVMethodAddresses()
			},
		})
	} catch (e) {
		console.error(`Error removing owner: ${getErrorMessage(e)}`)
		toast.error(`Error removing owner: ${getErrorMessage(e)}`)
	} finally {
		loadingRemoveOwners.value.delete(_ownerAddress)
	}
}

const isLoadingAddOwner = ref(false)
async function onClickAddOwner() {
	if (!selectedAccount.value) {
		throw new Error('[OwnableValidatorSettingsModal#onClickRemoveOwner] No selected account')
	}

	try {
		if (!newOwnerAddress.value || !isAddress(newOwnerAddress.value)) {
			throw new Error('Please enter a valid owner address')
		}

		isLoadingAddOwner.value = true
		const execution: TxModalExecution = {
			description: `Add owner ${shortenAddress(newOwnerAddress.value)}`,
			to: ADDRESS.OwnableValidator,
			data: await OwnableValidatorAPI.encodeAddOwner(
				client.value,
				selectedAccount.value.address,
				newOwnerAddress.value,
			),
			value: 0n,
		}
		useTxModal().openModal({
			executions: [execution],
			onSuccess: async () => {
				toast.success('Owner added successfully')

				await loadOwners()
				updateOwnableValidatorVMethodAddresses()

				// clear the new owner address input
				newOwnerAddress.value = ''
			},
		})
	} catch (e) {
		console.error(`Error adding owner: ${getErrorMessage(e)}`)
		toast.error(`Error adding owner: ${getErrorMessage(e)}`)
	} finally {
		isLoadingAddOwner.value = false
	}
}

const isLoading = computed(() => isLoadingOwners.value || loadingRemoveOwners.value.size > 0 || isLoadingAddOwner.value)
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
			<div class="space-y-6">
				<!-- Error -->
				<div v-if="errorGetOwners" class="text-sm text-destructive">
					{{ errorGetOwners }}
				</div>

				<!-- Loading -->
				<div v-if="isLoadingOwners" class="flex justify-center items-center">
					<Loader2 class="w-4 h-4 animate-spin" />
				</div>

				<!-- Owners -->
				<div v-else class="grid gap-3">
					<div class="text-sm font-medium">Owners</div>
					<div
						v-for="owner in owners"
						:key="owner"
						class="py-3 px-4 bg-card border border-border/40 rounded-lg flex justify-between items-center"
					>
						<Address :address="owner" />
						<Button
							variant="ghost"
							size="icon"
							class="text-destructive hover:text-destructive"
							@click="onClickRemoveOwner(owner)"
							:loading="loadingRemoveOwners.has(owner)"
							:disabled="isLoading"
						>
							<Trash2 class="w-4 h-4" />
						</Button>
					</div>
				</div>

				<!-- Add Owner Section -->
				<div class="space-y-3 mt-6">
					<div class="text-sm font-medium">Add New Owner</div>
					<div class="space-y-3">
						<Input v-model="newOwnerAddress" placeholder="New owner address" class="w-full" />
						<Button
							@click="onClickAddOwner"
							class="w-full"
							:disabled="!newOwnerAddress || !isAddress(newOwnerAddress) || isLoading"
							:loading="isLoadingAddOwner"
						>
							Add Owner
						</Button>
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
