import { CHAIN_ID, isSupportedChainId } from '@/stores/blockchain/chains'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { standardErrors } from '@samanager/sdk'

export function validateChainIdFormat(chainIdHex: string) {
	// Check hex format with 0x prefix
	if (!chainIdHex.startsWith('0x')) {
		throw standardErrors.rpc.invalidParams('chainId must have 0x prefix')
	}

	// Check for leading zeros (invalid per EIP-5792)
	const hexValue = chainIdHex.slice(2)
	if (hexValue.length > 1 && hexValue.startsWith('0')) {
		throw standardErrors.rpc.invalidParams('chainId must not have leading zeros')
	}
}

export function validateChainIdSupport(chainIdHex: string): CHAIN_ID {
	const chainId = parseInt(chainIdHex, 16).toString()
	if (!isSupportedChainId(chainId)) {
		throw standardErrors.provider.unsupportedChainId()
	}
	return chainId
}

export function validateChainIdMatchesSelectedChain(chainIdHex: string) {
	const chainId = parseInt(chainIdHex, 16).toString()
	const { selectedChainId } = useBlockchain()
	if (chainId !== selectedChainId.value) {
		throw standardErrors.provider.unsupportedChainId('chainId field does not match the currently selected chain')
	}
}
