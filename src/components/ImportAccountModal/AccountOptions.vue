<script setup lang="ts">
import { fetchAccountId } from '@/lib/aa'
import { useNetwork } from '@/stores/useNetwork'
import { useImportAccountModal } from '@/stores/useImportAccountModal'
import { AccountId } from '@/lib/account'
import { usePasskey } from '@/stores/usePasskey'
import { shortenAddress } from '@vue-dapp/core'
import { Contract, EventLog } from 'ethers'
import { ChevronRight, Loader2 } from 'lucide-vue-next'
import { ADDRESS } from 'sendop'
import { toast } from 'vue-sonner'

// Props
interface Props {
	mode: 'eoa' | 'passkey'
	eoaAddress?: () => string
}

const props = defineProps<Props>()

const emit = defineEmits<{
	(
		e: 'accountSelected',
		account: {
			address: string
			accountId: AccountId
		},
	): void
}>()

// Types
interface AccountInfo {
	address: string
	accountId: string | null
	loading: boolean
}

// Stores
const { goNextStage } = useImportAccountModal()
const { credential } = usePasskey()
const { clientNoBatch } = useNetwork()

// State
const accounts = ref<AccountInfo[]>([])
const loading = ref(false)
const loadingAddresses = ref(false)

// Lifecycle
onMounted(async () => {
	try {
		loading.value = true
		loadingAddresses.value = true

		let addresses: string[] = []
		if (props.mode === 'eoa') {
			if (!props.eoaAddress?.()) throw new Error('EOA mode requires eoaAddress')
			addresses = await getAccountsByECDSAValidator(props.eoaAddress())
		} else {
			if (!credential.value) throw new Error('No passkey credential found')
			addresses = await getAccountsByWebAuthnValidator(credential.value.authenticatorIdHash)
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

// Methods
async function getAccountsByECDSAValidator(address: string): Promise<string[]> {
	const ecdsaValidator = new Contract(
		ADDRESS.ECDSAValidator,
		['event OwnerRegistered(address indexed kernel, address indexed owner)'],
		clientNoBatch.value,
	)
	const events = (await ecdsaValidator.queryFilter(
		ecdsaValidator.filters.OwnerRegistered(null, address),
	)) as EventLog[]

	const sortedEvents = events.sort((a, b) => b.blockNumber - a.blockNumber)
	return sortedEvents.slice(0, 5).map(event => event.args[0]) as string[]
}

async function getAccountsByWebAuthnValidator(authenticatorIdHash: string): Promise<string[]> {
	const webAuthnValidator = new Contract(
		ADDRESS.WebAuthnValidator,
		[
			'event WebAuthnPublicKeyRegistered(address indexed kernel, bytes32 indexed authenticatorIdHash, uint256 pubKeyX, uint256 pubKeyY)',
		],
		clientNoBatch.value,
	)

	const events = (await webAuthnValidator.queryFilter(
		webAuthnValidator.filters.WebAuthnPublicKeyRegistered(null, authenticatorIdHash),
	)) as EventLog[]

	const sortedEvents = events.sort((a, b) => b.blockNumber - a.blockNumber)
	return sortedEvents.slice(0, 5).map(event => event.args[0]) as string[]
}

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
		<div v-else class="space-y-2">
			<div
				v-for="account in accounts"
				:key="account.address"
				:disabled="!account.accountId"
				@click="onClickAccount({ address: account.address, accountId: account.accountId })"
				class="group flex items-center justify-between p-4 rounded-lg border transition-all hover:bg-accent cursor-pointer"
				:class="{ 'opacity-50 cursor-not-allowed': account.loading }"
			>
				<div class="space-y-1">
					<div class="font-medium group-hover:text-accent-foreground">
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
