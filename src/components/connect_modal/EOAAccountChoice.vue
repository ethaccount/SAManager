<script setup lang="ts">
import { useConnectModal, ConnectModalStageKey } from '@/stores/useConnectModal'
import { useApp } from '@/stores/app'
import { Contract, EventLog } from 'ethers'
import { ECDSA_VALIDATOR } from '@/config'
import { shortenAddress } from '@vue-dapp/core'
import { fetchAccountId } from '@/core/aa'
import { Loader2 } from 'lucide-vue-next'
import { AccountId } from '@/types'

interface AccountInfo {
	address: string
	accountId: AccountId | null
	loading: boolean
}

const { store, assertStage, updateStore, goNextStage } = useConnectModal()

assertStage(ConnectModalStageKey.EOA_ACCOUNT_CHOICE)

const accounts = ref<AccountInfo[]>([])
const loading = ref(false)
const loadingAddresses = ref(false)

onMounted(async () => {
	loading.value = true
	loadingAddresses.value = true
	if (!store.value.eoaAddress) {
		throw new Error('EOAAccountChoice: !store.value.eoaAddress')
	}

	try {
		const addresses = await getAccountsByECDSAValidator(store.value.eoaAddress)
		accounts.value = addresses.map(address => ({
			address,
			accountId: null,
			loading: true,
		}))
		loadingAddresses.value = false

		const { client } = useApp()
		const accountIdPromises = addresses.map((address, index) =>
			fetchAccountId(address, client.value)
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
		console.error(error)
	} finally {
		loading.value = false
		loadingAddresses.value = false
	}
})

async function getAccountsByECDSAValidator(address: string): Promise<string[]> {
	const { client } = useApp()
	const ecdsaValidator = new Contract(
		ECDSA_VALIDATOR,
		['event OwnerRegistered(address indexed kernel, address indexed owner)'],
		client.value,
	)
	const events = (await ecdsaValidator.queryFilter(
		ecdsaValidator.filters.OwnerRegistered(null, address),
	)) as EventLog[]

	const sortedEvents = events.sort((a, b) => b.blockNumber - a.blockNumber)
	return sortedEvents.slice(0, 5).map(event => event.args[0]) as string[]
}

function onClickAccount(accountInfo: AccountInfo) {
	updateStore({
		accountId: accountInfo.accountId,
		deployedAddress: accountInfo.address,
	})
	goNextStage()
}
</script>

<template>
	<div>
		<Card>
			<CardContent class="grid px-4 py-2">
				<div class="flex items-center justify-center">
					<Loader2 v-if="loadingAddresses" class="w-4 h-4 mr-2 animate-spin" />
				</div>

				<div
					class="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground cursor-pointer"
					v-for="account in accounts"
					:key="account.address"
					@click="onClickAccount(account)"
				>
					<div class="space-y-1">
						<p class="text-sm font-medium leading-none">{{ shortenAddress(account.address) }}</p>
						<p class="text-sm text-muted-foreground">
							{{ account.loading ? 'loading...' : account.accountId }}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>
</template>

<style lang="css"></style>
