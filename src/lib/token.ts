export type Token = {
	id: string
	symbol: string
	name: string
	icon: string
	address: string
}

export type TokenTransfer = {
	recipient: string
	amount: string
	tokenId: string
}

export const tokens: Token[] = [
	{ id: 'eth', symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' },
	// { id: 'usdc', symbol: 'USDC', name: 'USD Coin', icon: '$', address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' },
]
