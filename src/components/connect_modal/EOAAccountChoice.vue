<script setup lang="ts">
import { useConnectModal, ConnectFlowState } from '@/stores/connect_modal'

const { store, assertState } = useConnectModal()

assertState(ConnectFlowState.EOA_ACCOUNT_CHOICE)

getAccountsByECDSAValidator(store.value.eoaAddress)
function getAccountsByECDSAValidator(address: string) {}
</script>

<template>
	<div>EOAAccountChoice</div>
</template>

<style lang="css"></style>
