interface ErrorCodes {
	readonly rpc: {
		readonly invalidInput: -32000
		readonly resourceNotFound: -32001
		readonly resourceUnavailable: -32002
		readonly transactionRejected: -32003
		readonly methodNotSupported: -32004
		readonly limitExceeded: -32005
		readonly parse: -32700
		readonly invalidRequest: -32600
		readonly methodNotFound: -32601
		readonly invalidParams: -32602
		readonly internal: -32603
	}
	readonly provider: {
		readonly userRejectedRequest: 4001
		readonly unauthorized: 4100
		readonly unsupportedMethod: 4200
		readonly disconnected: 4900
		readonly chainDisconnected: 4901
		readonly unsupportedChain: 4902

		// EIP-5792: Wallet Call API errors
		readonly unsupportedCapability: 5700
		readonly unsupportedChainId: 5710
		readonly duplicateId: 5720
		readonly unknownBundleId: 5730
		readonly bundleTooLarge: 5740
		readonly atomicUpgradeRejected: 5750
		readonly atomicityNotSupported: 5760
	}
}

export const standardErrorCodes: ErrorCodes = {
	rpc: {
		invalidInput: -32000,
		resourceNotFound: -32001,
		resourceUnavailable: -32002,
		transactionRejected: -32003,
		methodNotSupported: -32004,
		limitExceeded: -32005,
		parse: -32700,
		invalidRequest: -32600,
		methodNotFound: -32601,
		invalidParams: -32602,
		internal: -32603,
	},
	provider: {
		userRejectedRequest: 4001,
		unauthorized: 4100,
		unsupportedMethod: 4200,
		disconnected: 4900,
		chainDisconnected: 4901,
		unsupportedChain: 4902,
		// EIP-5792: Wallet Call API errors
		unsupportedCapability: 5700,
		unsupportedChainId: 5710,
		duplicateId: 5720,
		unknownBundleId: 5730,
		bundleTooLarge: 5740,
		atomicUpgradeRejected: 5750,
		atomicityNotSupported: 5760,
	},
}

export const errorValues = {
	'-32700': {
		standard: 'JSON RPC 2.0',
		message:
			'Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text.',
	},
	'-32600': {
		standard: 'JSON RPC 2.0',
		message: 'The JSON sent is not a valid Request object.',
	},
	'-32601': {
		standard: 'JSON RPC 2.0',
		message: 'The method does not exist / is not available.',
	},
	'-32602': {
		standard: 'JSON RPC 2.0',
		message: 'Invalid method parameter(s).',
	},
	'-32603': {
		standard: 'JSON RPC 2.0',
		message: 'Internal JSON-RPC error.',
	},
	'-32000': {
		standard: 'EIP-1474',
		message: 'Invalid input.',
	},
	'-32001': {
		standard: 'EIP-1474',
		message: 'Resource not found.',
	},
	'-32002': {
		standard: 'EIP-1474',
		message: 'Resource unavailable.',
	},
	'-32003': {
		standard: 'EIP-1474',
		message: 'Transaction rejected.',
	},
	'-32004': {
		standard: 'EIP-1474',
		message: 'Method not supported.',
	},
	'-32005': {
		standard: 'EIP-1474',
		message: 'Request limit exceeded.',
	},
	'4001': {
		standard: 'EIP-1193',
		message: 'User rejected the request.',
	},
	'4100': {
		standard: 'EIP-1193',
		message: 'The requested account and/or method has not been authorized by the user.',
	},
	'4200': {
		standard: 'EIP-1193',
		message: 'The requested method is not supported by this Ethereum provider.',
	},
	'4900': {
		standard: 'EIP-1193',
		message: 'The provider is disconnected from all chains.',
	},
	'4901': {
		standard: 'EIP-1193',
		message: 'The provider is disconnected from the specified chain.',
	},
	'4902': {
		standard: 'EIP-3085',
		message: 'Unrecognized chain ID.',
	},
	// EIP-5792: Wallet Call API error codes
	'5700': {
		standard: 'EIP-5792',
		message: 'Unsupported non-optional capability.',
	},
	'5710': {
		standard: 'EIP-5792',
		message: 'Unsupported chain id.',
	},
	'5720': {
		standard: 'EIP-5792',
		message: 'Duplicate ID.',
	},
	'5730': {
		standard: 'EIP-5792',
		message: 'Unknown bundle id.',
	},
	'5740': {
		standard: 'EIP-5792',
		message: 'Bundle too large.',
	},
	'5750': {
		standard: 'EIP-5792',
		message: 'Atomic-ready wallet rejected upgrade.',
	},
	'5760': {
		standard: 'EIP-5792',
		message: 'Atomicity not supported.',
	},
}
