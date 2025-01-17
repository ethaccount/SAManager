<script setup lang="ts">
import { useConnectModal, ConnectModalStageKey } from '@/stores/connect_modal'
import { useApp } from '@/stores/app'
import { Contract, EventLog } from 'ethers'
import { ECDSA_VALIDATOR } from '@/config'
import { shortenAddress } from '@vue-dapp/core'

const { store, assertStage } = useConnectModal()

assertStage(ConnectModalStageKey.EOA_ACCOUNT_CHOICE)

const accounts = ref<string[]>([])
const loading = ref(false)

onMounted(async () => {
	loading.value = true
	if (!store.value.eoaAddress) {
		throw new Error('EOAAccountChoice: !store.value.eoaAddress')
	}

	try {
		accounts.value = await getAccountsByECDSAValidator(store.value.eoaAddress)
	} catch (error) {
		console.error(error)
	} finally {
		loading.value = false
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
</script>

<template>
	<div>
		<div v-if="loading">Loading...</div>
		<div v-for="account in accounts" :key="account">
			<Button>{{ shortenAddress(account) }}</Button>
		</div>
	</div>
</template>

<style lang="css"></style>
