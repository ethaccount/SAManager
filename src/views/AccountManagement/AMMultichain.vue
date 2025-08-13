<script setup lang="ts">
import { fetchAccountCode } from '@/api/etherscan'
import ChainIcon from '@/components/ChainIcon.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Address from '@/components/utils/Address.vue'
import { SUPPORTED_CHAIN_IDS } from '@/config'
import { extractDelegateAddress } from '@/lib/7702'
import { addressToName } from '@/lib/addressToName'
import { ImportedAccount } from '@/stores/account/account'
import { useAccount } from '@/stores/account/useAccount'
import { useAccounts } from '@/stores/account/useAccounts'
import { useInitCode } from '@/stores/account/useInitCode'
import { CHAIN_ID, CHAIN_NAME } from '@/stores/blockchain/chains'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { useTxModal } from '@/stores/useTxModal'
import { isSameAddress } from 'sendop'

const props = defineProps<{
	selectedAccount: ImportedAccount
	isDeployed: boolean
	isModular: boolean
}>()

const { isMultichain, isSmartEOA } = useAccount()
const { importAccount, selectAccount, isAccountImported } = useAccounts()
const { getInitCodeData } = useInitCode()
const { selectedChainId, switchChain } = useBlockchain()

function getDelegateAccountId(delegateAddress: string): string | null {
	return addressToName(delegateAddress) || null
}

interface ChainDeploymentInfo {
	chainId: CHAIN_ID
	chainName: string
	address: string
	isDeployed: boolean
	delegateAddress: string | null
	isLoading: boolean
	isMultichain: boolean
	isSmartEOA: boolean
	error: string | null
}

const chainDeployments = ref<ChainDeploymentInfo[]>([])
const isLoadingDeployments = ref(false)

onMounted(async () => {
	await updateChainDeployments()
})

watch(
	() => props.selectedAccount,
	async (newAccount, oldAccount) => {
		// only re-initialize when the account address changes
		if (!isSameAddress(newAccount.address, oldAccount.address)) {
			await updateChainDeployments()
		}
	},
)

async function updateChainDeployments() {
	isLoadingDeployments.value = true

	const deployments: ChainDeploymentInfo[] = []

	for (const chainId of SUPPORTED_CHAIN_IDS) {
		const address = props.selectedAccount.address

		deployments.push({
			chainId,
			chainName: CHAIN_NAME[chainId],
			address,
			isDeployed: false,
			delegateAddress: null,
			isLoading: true,
			isMultichain: isMultichain.value,
			isSmartEOA: isSmartEOA.value,
			error: null,
		})
	}

	chainDeployments.value = deployments

	const promises = chainDeployments.value.map(async deployment => {
		try {
			const code = await fetchAccountCode(deployment.address, deployment.chainId)
			if (deployment.isSmartEOA) {
				deployment.delegateAddress = extractDelegateAddress(code)
			} else {
				deployment.isDeployed = code !== '0x' && code !== ''
			}
		} catch (error) {
			deployment.isDeployed = false
			deployment.error = `Failed to check deployment for ${deployment.chainName}: ${error instanceof Error ? error.message : String(error)}`
		} finally {
			deployment.isLoading = false
		}
	})

	await Promise.all(promises)

	isLoadingDeployments.value = false
}

async function onClickDeploy(chainId: CHAIN_ID) {
	try {
		// Get the init code data for this account address
		const initCodeData = getInitCodeData(props.selectedAccount.address)
		if (!initCodeData) {
			throw new Error(`No init code found for account ${props.selectedAccount.address}`)
		}

		// Switch to the target chain if needed
		if (selectedChainId.value !== chainId) {
			switchChain(chainId)
		}

		// Import account to the target chain if not already imported
		if (!isAccountImported(props.selectedAccount.address, chainId)) {
			importAccount(
				{
					accountId: props.selectedAccount.accountId,
					category: props.selectedAccount.category,
					address: props.selectedAccount.address,
					chainId: chainId,
					vMethods: props.selectedAccount.vMethods,
				},
				initCodeData.initCode,
			)
		}

		// Select the account on the target chain
		selectAccount(props.selectedAccount.address, chainId)

		useTxModal().openModal({
			onSuccess: async () => {
				// Update the deployment status when the transaction succeeds
				// TODO: After transaction success, eth_getCode may not reflect deployment immediately due to block confirmation delay.
				await updateChainDeployments()
			},
		})
	} catch (error) {
		console.error('Failed to deploy to chain:', error)
		// Update the specific deployment with error state
		const deployment = chainDeployments.value.find(d => d.chainId === chainId)
		if (deployment) {
			deployment.error = `Deployment failed: ${error instanceof Error ? error.message : String(error)}`
		}
	}
}
</script>

<template>
	<Card class="p-4">
		<div class="space-y-3">
			<div
				v-for="deployment in chainDeployments"
				:key="deployment.chainId"
				class="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
			>
				<div class="flex items-center justify-between">
					<!-- Left part: Network and Status -->
					<div class="space-y-2">
						<!-- Network Icon and Name -->
						<div class="flex items-center space-x-2">
							<ChainIcon :chain-id="deployment.chainId" :size="24" />
							<div class="text-sm font-medium">{{ deployment.chainName }}</div>
							<div
								v-if="deployment.isLoading"
								class="animate-spin h-3 w-3 border border-primary border-t-transparent rounded-full"
							></div>
						</div>

						<!-- Status/Delegate Info -->
						<div v-if="!deployment.isLoading">
							<!-- Error State -->
							<div v-if="deployment.error" class="flex items-center space-x-1.5">
								<div class="w-1.5 h-1.5 rounded-full bg-red-500"></div>
								<span class="text-xs text-red-600">{{ deployment.error }}</span>
							</div>

							<!-- Smart EOA: Show delegate address or "No delegate" -->
							<template v-else-if="deployment.isSmartEOA">
								<div class="flex items-center space-x-1.5">
									<div
										:class="[
											'w-1.5 h-1.5 rounded-full',
											deployment.delegateAddress ? 'bg-green-500' : 'bg-gray-300',
										]"
									></div>
									<div v-if="deployment.delegateAddress" class="text-xs">
										<div
											v-if="getDelegateAccountId(deployment.delegateAddress)"
											class="text-primary"
										>
											{{ getDelegateAccountId(deployment.delegateAddress) }}
										</div>
										<Address
											v-else
											:address="deployment.delegateAddress"
											text-size="xs"
											button-size="xs"
											:show-buttons="false"
										/>
									</div>
									<span v-else class="text-xs text-muted-foreground">No delegate</span>
								</div>
							</template>

							<!-- Regular Smart Account: Show deployment status -->
							<template v-else>
								<div class="flex items-center space-x-1.5">
									<div
										:class="[
											'w-1.5 h-1.5 rounded-full',
											deployment.isDeployed ? 'bg-green-500' : 'bg-gray-300',
										]"
									></div>
									<span class="text-xs" :class="{ 'text-muted-foreground': !deployment.isDeployed }">
										{{ deployment.isDeployed ? 'Deployed' : 'Not Deployed' }}
									</span>
								</div>
							</template>
						</div>
					</div>

					<!-- Right part: Deploy button (centered) -->
					<div class="flex items-center justify-center">
						<Button
							v-if="deployment.isMultichain && !deployment.isDeployed"
							@click="onClickDeploy(deployment.chainId)"
							size="sm"
							variant="outline"
						>
							Deploy
						</Button>
					</div>
				</div>
			</div>

			<div v-if="chainDeployments.length === 0" class="text-center py-8 text-muted-foreground">
				No supported chains available
			</div>
		</div>
	</Card>
</template>

<style lang="css" scoped></style>
