<script setup lang="ts">
import { fetchAccountId } from '@/lib/aa'
import { AccountId } from '@/stores/account/account'
import { useNetwork } from '@/stores/network/useNetwork'
import { deserializePasskeyCredential } from '@/stores/passkey/passkey'
import { SUPPORTED_VALIDATION_OPTIONS, ValidationIdentifier } from '@/stores/validation/validation'
import { shortenAddress } from '@vue-dapp/core'
import { ChevronRight, Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const props = defineProps<{
	vOption: () => ValidationIdentifier
}>()

const emit = defineEmits<{
	(
		e: 'accountSelected',
		account: {
			address: string
			accountId: AccountId
		},
	): void
}>()

const { clientNoBatch } = useNetwork()

const accounts = ref<
	{
		address: string
		accountId: string | null
		loading: boolean
	}[]
>([])
const loading = ref(false)
const loadingAddresses = ref(false)

onMounted(async () => {
	try {
		loading.value = true
		loadingAddresses.value = true

		let addresses: string[] = []

		const vType = props.vOption().type

		if (vType !== 'EOA-Owned' && vType !== 'Passkey') {
			throw new Error('Unsupported validation type')
		}

		switch (vType) {
			case 'EOA-Owned':
				addresses = await SUPPORTED_VALIDATION_OPTIONS['EOA-Owned'].getAccounts(
					clientNoBatch.value,
					props.vOption().identifier,
				)
				break
			case 'Passkey':
				const credential = deserializePasskeyCredential(props.vOption().identifier)
				addresses = await SUPPORTED_VALIDATION_OPTIONS['Passkey'].getAccounts(
					clientNoBatch.value,
					credential.authenticatorIdHash,
				)
				break
		}

		accounts.value = addresses.map(address => ({
			address,
			accountId: null,
			loading: true,
		}))
		loadingAddresses.value = false

		const accountIdPromises = addresses.map((address, index) =>
			fetchAccountId(address, clientNoBatch.value)
				.then(accountId => {
					accounts.value[index].accountId = accountId
					accounts.value[index].loading = false
				})
				.catch(error => {
					console.error(`Error fetching account ID for ${address}:`, error)
					accounts.value[index].loading = false
				}),
		)

		await Promise.all(accountIdPromises)
	} catch (error) {
		throw error
	} finally {
		loading.value = false
		loadingAddresses.value = false
	}
})

function onClickAccount(account: { address: string; accountId: string | null }) {
	if (loading.value) {
		toast.error('Still loading...')
		return
	}
	if (!account.accountId) {
		toast.error('Account ID is null')
		return
	}
	if (AccountId[account.accountId] === null) {
		toast.error('Account ID not supported')
		return
	}
	emit('accountSelected', {
		address: account.address,
		accountId: AccountId[account.accountId],
	})
}
</script>

<template>
	<div class="w-full">
		<!-- Loading State -->
		<div v-if="loadingAddresses" class="flex justify-center py-4">
			<Loader2 class="w-6 h-6 animate-spin text-primary" />
		</div>

		<!-- Empty State -->
		<div v-else-if="accounts.length === 0" class="text-center py-8 text-muted-foreground">No accounts found</div>

		<!-- Account List -->
		<div v-else class="space-y-2 overflow-y-auto max-h-[300px]">
			<div
				v-for="account in accounts"
				:key="account.address"
				:disabled="!account.accountId"
				@click="onClickAccount({ address: account.address, accountId: account.accountId })"
				class="group flex items-center justify-between p-4 rounded-lg border transition-all hover:bg-accent cursor-pointer"
				:class="{ 'opacity-50 cursor-not-allowed': account.loading }"
			>
				<div class="space-y-1">
					<div class="text-sm font-medium group-hover:text-accent-foreground">
						{{ shortenAddress(account.address) }}
					</div>
					<div class="text-sm text-muted-foreground">
						<span v-if="account.loading" class="flex items-center">
							<Loader2 class="w-3 h-3 mr-2 animate-spin" />
							Loading...
						</span>
						<span v-else>{{ account.accountId }}</span>
					</div>
				</div>

				<div class="opacity-0 group-hover:opacity-100 transition-opacity">
					<ChevronRight class="w-4 h-4" />
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="css" scoped></style>
