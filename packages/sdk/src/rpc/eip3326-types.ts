export type WalletSwitchEthereumChainRequest = {
	method: 'wallet_switchEthereumChain'
	params: [
		{
			chainId: string
		},
	]
}

export type WalletSwitchEthereumChainResponse = null
