import { ADDRESS } from 'sendop'
import { ERC7579_MODULE_TYPE } from 'sendop'

export const MODULE_TYPE_LABELS = {
	[ERC7579_MODULE_TYPE.VALIDATOR]: 'Validator Modules',
	[ERC7579_MODULE_TYPE.EXECUTOR]: 'Executor Modules',
	[ERC7579_MODULE_TYPE.HOOK]: 'Hook Modules',
	[ERC7579_MODULE_TYPE.FALLBACK]: 'Fallback Modules',
} as const

export const SUPPORTED_MODULES: {
	[key: string]: {
		name: string
		description: string
		type: ERC7579_MODULE_TYPE
		address: string
		disabled: boolean
		canInstall: boolean
	}
} = {
	OwnableValidator: {
		name: 'Ownable Validator',
		description: 'EOA-owned validation module for your account',
		type: ERC7579_MODULE_TYPE.VALIDATOR,
		address: ADDRESS.OwnableValidator,
		disabled: true,
		canInstall: true,
	},
	WebAuthnValidator: {
		name: 'WebAuthn Validator',
		description: 'Domain-bound authentication using Passkeys',
		type: ERC7579_MODULE_TYPE.VALIDATOR,
		address: ADDRESS.WebAuthnValidator,
		disabled: false,
		canInstall: true,
	},
	ECDSAValidator: {
		name: 'ECDSA Validator',
		description: 'EOA-owned validation module for your account',
		type: ERC7579_MODULE_TYPE.VALIDATOR,
		address: ADDRESS.ECDSAValidator,
		disabled: false,
		canInstall: true,
	},
	SmartSession: {
		name: 'Smart Session',
		description: 'Smart Session module for your account',
		type: ERC7579_MODULE_TYPE.VALIDATOR,
		address: ADDRESS.SmartSession,
		disabled: true,
		canInstall: false,
	},
	ScheduledTransfers: {
		name: 'Scheduled Transfers',
		description: 'Scheduled transfers module for your account',
		type: ERC7579_MODULE_TYPE.EXECUTOR,
		address: ADDRESS.ScheduledTransfers,
		disabled: false,
		canInstall: false,
	},
	ScheduledOrders: {
		name: 'Scheduled Orders',
		description: 'Scheduled orders module for your account',
		type: ERC7579_MODULE_TYPE.EXECUTOR,
		address: ADDRESS.ScheduledOrders,
		disabled: false,
		canInstall: false,
	},
} as const

export type ModuleType = keyof typeof SUPPORTED_MODULES
