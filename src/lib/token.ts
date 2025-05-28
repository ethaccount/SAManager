import { DateValue } from '@internationalized/date'

export type Token = {
	id: string
	symbol: string
	name: string
	icon: string
	address: string
	decimals: number
}

export type TokenTransfer = {
	recipient: string
	amount: string
	tokenId: string
}

export type ScheduleTransfer = TokenTransfer & {
	frequency: string
	times: number
	startDate: DateValue
}

export const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

export const tokens: Token[] = [
	{ id: 'eth', symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', address: NATIVE_TOKEN_ADDRESS, decimals: 18 },
	{
		id: 'test',
		symbol: 'SAM',
		name: 'SAManager',
		icon: '💠',
		address: '0xef26611a6f2cb9f2f6234F4635d98a7094c801Ce',
		decimals: 18,
	},
	// { id: 'usdc', symbol: 'USDC', name: 'USD Coin', icon: '$', address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' },
]
