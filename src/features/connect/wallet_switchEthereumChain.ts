import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { WalletSwitchEthereumChainRequest, WalletSwitchEthereumChainResponse } from '@samanager/sdk'
import { validateChainIdFormat, validateChainIdSupport } from './common'

export async function handleWalletSwitchEthereumChain(
	params: WalletSwitchEthereumChainRequest['params'],
): Promise<WalletSwitchEthereumChainResponse> {
	const { chainId: chainIdHex } = params[0]
	validateChainIdFormat(chainIdHex)
	const chainId = validateChainIdSupport(chainIdHex)

	const { switchChain } = useBlockchain()
	switchChain(chainId)

	return null
}
