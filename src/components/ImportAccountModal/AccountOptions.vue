<script setup lang="ts">
import { AccountId } from '@/stores/account/account'
import { useNetwork } from '@/stores/network/useNetwork'
import { getAuthenticatorIdHash } from '@/stores/passkey/passkeyNoRp'
import { SUPPORTED_VALIDATION_OPTIONS, ValidationOption } from '@/stores/validation/validation'
import { shortenAddress } from '@vue-dapp/core'
import { getAddress, JsonRpcProvider } from 'ethers'
import { ChevronRight, Loader2 } from 'lucide-vue-next'
import { ERC7579_MODULE_TYPE, TIERC7579Account__factory } from 'sendop'
import { toast } from 'vue-sonner'

const props = defineProps<{
	vOption: () => ValidationOption
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

		const { tenderlyClient, client } = useNetwork()

		if (!tenderlyClient.value) {
			throw new Error("Tenderly RPC Node isn't configured on current network")
		}

		switch (vType) {
			case 'EOA-Owned':
				addresses = await SUPPORTED_VALIDATION_OPTIONS['EOA-Owned'].getAccounts(
					tenderlyClient.value, // use tenderly client for event logs
					props.vOption().identifier,
				)

				// Specially check if the module is installed because the ECDSAValidator doesn't emit event when uninstalled
				let filteredAddresses: string[] = []
				for (const address of addresses) {
					const account = TIERC7579Account__factory.connect(address, client.value) // use client for batch RPC
					const isInstalled = await account.isModuleInstalled(
						ERC7579_MODULE_TYPE.VALIDATOR,
						SUPPORTED_VALIDATION_OPTIONS['EOA-Owned'].validatorAddress,
						'0x',
					)

					if (!isInstalled) {
						filteredAddresses.push(getAddress(address))
					}
				}

				addresses = addresses.filter(a => !filteredAddresses.includes(getAddress(a)))
				break
			case 'Passkey':
				const credentialId = props.vOption().identifier
				if (!credentialId) {
					throw new Error('AccountOptions(onMounted): Passkey credential ID not found')
				}
				addresses = await SUPPORTED_VALIDATION_OPTIONS['Passkey'].getAccounts(
					tenderlyClient.value, // use tenderly client for event logs
					getAuthenticatorIdHash(credentialId),
				)
				break
		}

		accounts.value = addresses.map(address => ({
			address,
			accountId: null,
			loading: true,
		}))
		loadingAddresses.value = false

		async function fetchAccountId(client: JsonRpcProvider, address: string) {
			const account = TIERC7579Account__factory.connect(address, client)
			return await account.accountId()
		}

		const accountIdPromises = addresses.map((address, index) =>
			fetchAccountId(client.value, address)
				.then(accountId => {
					accounts.value[index].accountId = accountId
					accounts.value[index].loading = false
				})
				.catch((e: unknown) => {
					throw new Error(`Error fetching account ID for ${address}`, {
						cause: e,
					})
				})
				.finally(() => {
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
