<script setup lang="ts">
import { fetchAccountCode } from '@/api/etherscan'
import ChainIcon from '@/components/ChainIcon.vue'
import Address from '@/components/utils/Address.vue'
import { SUPPORTED_CHAIN_IDS } from '@/config'
import { extractDelegateAddress } from '@/lib/7702'
import { ImportedAccount } from '@/stores/account/account'
import { useAccount } from '@/stores/account/useAccount'
import { CHAIN_ID, CHAIN_NAME } from '@/stores/blockchain/chains'
import { ADDRESS } from 'sendop'

const props = defineProps<{
	selectedAccount: ImportedAccount
	isDeployed: boolean
	isModular: boolean
}>()

const { isCrossChain, isSmartEOA } = useAccount()

// Delegate address to account ID mapping
const DELEGATE_ADDRESS_TO_ACCOUNT_ID: Record<string, string> = {
	[ADDRESS.Simple7702AccountV08]: 'infinitism.Simple7702Account.0.8.0',
	'0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00': 'Uniswap.Calibur.1.0.0',
	'0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B': 'MetaMask.EIP7702StatelessDeleGator.1.3.0',
}

function getDelegateAccountId(delegateAddress: string): string | null {
	return DELEGATE_ADDRESS_TO_ACCOUNT_ID[delegateAddress] || null
}

interface ChainDeploymentInfo {
	chainId: CHAIN_ID
	chainName: string
	address: string
	isDeployed: boolean
	delegateAddress: string | null
	isLoading: boolean
	isCrossChain: boolean
	isSmartEOA: boolean
	error: string | null
}

const chainDeployments = ref<ChainDeploymentInfo[]>([])
const isLoadingDeployments = ref(false)

onMounted(() => {
	initializeChainDeployments()
})

watch(
	() => props.selectedAccount,
	() => {
		initializeChainDeployments()
	},
)

async function initializeChainDeployments() {
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
			isCrossChain: isCrossChain.value,
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

async function deployToChain(chainId: CHAIN_ID) {
	// TODO: Implement deployment logic
	console.log(`Deploy to chain ${chainId}`)
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
							v-if="deployment.isCrossChain && !deployment.isDeployed"
							@click="deployToChain(deployment.chainId)"
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
