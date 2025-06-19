import { ADDRESS } from 'sendop'
import { ERC7579_MODULE_TYPE } from 'sendop'

export const MODULE_TYPE_LABELS = {
	[ERC7579_MODULE_TYPE.VALIDATOR]: 'Validator Modules',
	[ERC7579_MODULE_TYPE.EXECUTOR]: 'Executor Modules',
	[ERC7579_MODULE_TYPE.HOOK]: 'Hook Modules',
	[ERC7579_MODULE_TYPE.FALLBACK]: 'Fallback Modules',
} as const

export const SUPPORTED_MODULES = {
	OwnableValidator: {
		name: 'Ownable Validator',
		description: 'EOA-owned validation module for your account',
		type: ERC7579_MODULE_TYPE.VALIDATOR,
		address: ADDRESS.OwnableValidator,
		disabled: true,
	},
	WebAuthnValidator: {
		name: 'WebAuthn Validator',
		description: 'Domain-bound authentication using Passkeys',
		type: ERC7579_MODULE_TYPE.VALIDATOR,
		address: ADDRESS.WebAuthnValidator,
		disabled: false,
	},
	ECDSAValidator: {
		name: 'ECDSA Validator',
		description: 'EOA-owned validation module for your account',
		type: ERC7579_MODULE_TYPE.VALIDATOR,
		address: ADDRESS.ECDSAValidator,
		disabled: false,
	},
	SmartSession: {
		name: 'Smart Session',
		description: 'Smart Session module for your account',
		type: ERC7579_MODULE_TYPE.VALIDATOR,
		address: ADDRESS.SmartSession,
		disabled: true,
	},
	ScheduledTransfers: {
		name: 'Scheduled Transfers',
		description: 'Scheduled transfers module for your account',
		type: ERC7579_MODULE_TYPE.EXECUTOR,
		address: ADDRESS.ScheduledTransfers,
		disabled: false,
	},
	ScheduledOrders: {
		name: 'Scheduled Orders',
		description: 'Scheduled orders module for your account',
		type: ERC7579_MODULE_TYPE.EXECUTOR,
		address: ADDRESS.ScheduledOrders,
		disabled: false,
	},
} as const

export type ModuleType = keyof typeof SUPPORTED_MODULES
