import { useAccount } from '@/stores/account/useAccount'
import { useNetwork } from '@/stores/network/useNetwork'

export function useCheckDeployment() {
	// TODO:
	const { client, selectedChainId } = useNetwork()
	const { selectedAccount } = useAccount()

	const isDeployed = ref(false)
}
