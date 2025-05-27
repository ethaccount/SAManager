import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'

export function useCheckDeployment() {
	// TODO:
	const { client, selectedChainId } = useBlockchain()
	const { selectedAccount } = useAccount()

	const isDeployed = ref(false)
}
