import { useAccount } from '@/stores/account/useAccount'
import type { Call, Capability, WalletSendCallsRequest } from '@samanager/sdk'
import { standardErrors } from '@samanager/sdk'
import { isAddress } from 'ethers'
import { isSameAddress } from 'sendop'
import { isSupportedCapability } from './capabilities'
import { validateChainIdFormat, validateChainIdMatchesSelectedChain, validateChainIdSupport } from './common'

export function validateWalletSendCallsParams(params: WalletSendCallsRequest['params']) {
	// Validate basic parameter structure
	if (!Array.isArray(params) || params.length !== 1) {
		throw standardErrors.rpc.invalidParams('Invalid params structure')
	}

	const sendCallsParams = params[0]

	// Validate required fields
	if (typeof sendCallsParams.version !== 'string' || sendCallsParams.version !== '2.0') {
		throw standardErrors.rpc.invalidParams('Missing or invalid version field; Please set version to 2.0')
	}

	if (typeof sendCallsParams.chainId !== 'string') {
		throw standardErrors.rpc.invalidParams('Missing or invalid chainId field')
	}

	if (typeof sendCallsParams.atomicRequired !== 'boolean') {
		throw standardErrors.rpc.invalidParams('Missing or invalid atomicRequired field')
	}

	if (!Array.isArray(sendCallsParams.calls) || sendCallsParams.calls.length === 0) {
		throw standardErrors.rpc.invalidParams('Missing or invalid calls field')
	}

	// Validate chainId
	validateChainIdFormat(sendCallsParams.chainId)
	validateChainIdSupport(sendCallsParams.chainId)
	validateChainIdMatchesSelectedChain(sendCallsParams.chainId)

	// Validate from address if provided
	if (sendCallsParams.from) {
		validateFromAddress(sendCallsParams.from)
	}

	const { selectedAccount } = useAccount()
	if (!selectedAccount.value) {
		throw standardErrors.provider.unauthorized('No account selected')
	}
	const sender = sendCallsParams.from ?? selectedAccount.value.address

	// Validate call id if provided
	if (sendCallsParams.id) {
		throw standardErrors.rpc.invalidParams('Custom call id field is not supported')
	}

	// Validate calls array
	validateCalls(sendCallsParams.calls)

	// Validate capabilities if provided
	if (sendCallsParams.capabilities) {
		validateCapabilities(sender, sendCallsParams.capabilities)
	}
}

function validateFromAddress(from: string) {
	// Validate address format
	if (!isAddress(from)) {
		throw standardErrors.rpc.invalidParams('Invalid from address format')
	}

	// Check if address is authorized/connected
	const { selectedAccount } = useAccount()
	if (!selectedAccount.value) {
		throw standardErrors.provider.unauthorized('No account selected')
	}

	if (!isSameAddress(from, selectedAccount.value.address)) {
		throw standardErrors.provider.unauthorized('From address does not match selected account')
	}
}

function validateCalls(calls: unknown[]) {
	if (calls.length === 0) {
		throw standardErrors.rpc.invalidParams('Calls array cannot be empty')
	}

	for (const [index, call] of calls.entries()) {
		// Validate call structure
		if (typeof call !== 'object' || call === null) {
			throw standardErrors.rpc.invalidParams(`Invalid call at index ${index}`)
		}

		const callObj = call as Call

		// Validate to address if provided
		if (callObj.to && !isAddress(callObj.to)) {
			throw standardErrors.rpc.invalidParams(`Invalid to address at call index ${index}`)
		}

		// Validate data format if provided
		if (callObj.data && (typeof callObj.data !== 'string' || !callObj.data.startsWith('0x'))) {
			throw standardErrors.rpc.invalidParams(`Invalid data format at call index ${index}`)
		}

		// Validate value format if provided
		if (callObj.value && (typeof callObj.value !== 'string' || !callObj.value.startsWith('0x'))) {
			throw standardErrors.rpc.invalidParams(`Invalid value format at call index ${index}`)
		}

		// Validate call-level capabilities if provided
		if (callObj.capabilities) {
			throw standardErrors.rpc.invalidParams(`Call-level capabilities are not supported`)
		}
	}
}

function validateCapabilities(sender: string, capabilities: Record<string, unknown>) {
	for (const [capName, capValue] of Object.entries(capabilities)) {
		if (typeof capValue !== 'object' || capValue === null) {
			throw standardErrors.rpc.invalidParams(`Invalid capability ${capName} in ${sender}`)
		}

		const capObj = capValue as Capability

		// Check if capability is optional
		const isOptional = capObj.optional === true

		// If capability is not supported and not optional, reject
		if (!isOptional && !isSupportedCapability(sender, capName)) {
			throw standardErrors.provider.unsupportedCapability(`Unsupported capability: ${capName}`)
		}
	}
}
