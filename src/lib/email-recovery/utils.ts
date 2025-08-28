import { OwnableValidatorAPI } from '@/api/OwnableValidatorAPI'
import { buildPoseidon } from 'circomlibjs'
import type { JsonRpcProvider } from 'ethers'
import { Contract, hexlify, Interface } from 'ethers'
import { abiEncode, ADDRESS, ERC7579_MODULE_TYPE, type ERC7579Module } from 'sendop'

export const EMAIL_RECOVERY_EXECUTOR_ADDRESS = '0x636632FA22052d2a4Fb6e3Bab84551B620b9C1F9'
export const EMAIL_RELAYER_URL_BASE_SEPOLIA = 'https://auth-base-sepolia-staging.prove.email/api'

/**
 * @param client - The JSON RPC provider
 * @param accountAddress - The account address
 * @param email - The email address
 * @param delay - The delay in seconds (default: 6 hours)
 * @param expiry - The expiry in seconds (default: 2 weeks)
 * @returns The account code, guardian salt, and guardian address
 */
export async function createOwnableEmailRecovery({
	client,
	accountAddress,
	email,
	delay = 21600n, // 6 hours (minimumDelay)
	expiry = 2n * 7n * 24n * 60n * 60n, // 2 weeks in seconds
}: {
	client: JsonRpcProvider
	accountAddress: string
	email: string
	delay?: bigint
	expiry?: bigint
}) {
	const poseidon = await buildPoseidon()
	const accountCodeBytes: Uint8Array = poseidon.F.random()
	const accountCode = hexlify(accountCodeBytes.reverse())

	const response = await fetch(`${EMAIL_RELAYER_URL_BASE_SEPOLIA}/getAccountSalt`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			account_code: accountCode.slice(2),
			email_addr: email,
		}),
	})
	const guardianSalt = await response.text()
	const guardianAddress = await computeEmailAuthAddress(client, accountAddress, guardianSalt)

	const zkEmailModule = getEmailRecoveryExecutor({
		validator: ADDRESS.OwnableValidator,
		initialSelector: new Interface(['function addOwner(address)']).getFunction('addOwner')!.selector,
		guardians: [guardianAddress],
		delay,
		expiry,
	})

	return {
		module: zkEmailModule,
		accountCode,
		guardianSalt,
		guardianAddress,
	}
}

async function computeEmailAuthAddress(client: JsonRpcProvider, recoveredAccount: string, accountSalt: string) {
	try {
		const contract = new Contract(
			EMAIL_RECOVERY_EXECUTOR_ADDRESS,
			['function computeEmailAuthAddress(address recoveredAccount, bytes32 accountSalt) view returns (address)'],
			client,
		)
		return (await contract.computeEmailAuthAddress(recoveredAccount, accountSalt)) as string
	} catch (e) {
		throw new Error('Failed to compute email auth address', { cause: e })
	}
}

/**
 * @param validator - The validator address
 * @param isInstalledContext - The installed context
 * @param initialSelector - The function selector to allow when executing recovery for the specified module.
 * @param guardians - The guardians
 * @param weights - Voting weights for each corresponding guardian.
 * @param threshold - The minimum weight threshold required for recovery approval.
 * @param delay - 6 hours (minimumDelay)
 * @param expiry - The time period (in seconds) after which the recovery request expires.
 */
export function getEmailRecoveryExecutor({
	validator,
	isInstalledContext = '0x00',
	initialSelector,
	guardians,
	weights = [1n],
	threshold = 1n,
	delay = 21600n, // 6 hours (minimumDelay)
	expiry = 2n * 7n * 24n * 60n * 60n, // 2 weeks in seconds
}: {
	validator: string
	isInstalledContext?: string
	initialSelector: string
	guardians: string[]
	weights?: bigint[]
	threshold?: bigint
	delay?: bigint
	expiry?: bigint
}): ERC7579Module {
	return {
		type: ERC7579_MODULE_TYPE.EXECUTOR,
		address: EMAIL_RECOVERY_EXECUTOR_ADDRESS,
		initData: abiEncode(
			['address', 'bytes', 'bytes4', 'address[]', 'uint256[]', 'uint256', 'uint256', 'uint256'],
			[validator, isInstalledContext, initialSelector, guardians, weights, threshold, delay, expiry],
		),
		deInitData: '0x',
	}
}

export async function sendAcceptanceRequest(
	client: JsonRpcProvider,
	guardianEmail: string,
	accountAddress: string,
	accountCode: string,
) {
	const contract = new Contract(
		EMAIL_RECOVERY_EXECUTOR_ADDRESS,
		['function acceptanceCommandTemplates() view returns (string[][])'],
		client,
	)
	const subject = await contract.acceptanceCommandTemplates()

	const templateIdx = 0
	const handleAcceptanceCommand = (subject[0] as string[]).join(' ').replace('{ethAddr}', accountAddress)

	// Remove 0x prefix if it exists in the account code
	if (accountCode.startsWith('0x')) {
		accountCode = accountCode.slice(2)
	}

	const response = await fetch(`${EMAIL_RELAYER_URL_BASE_SEPOLIA}/acceptanceRequest`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			controller_eth_addr: EMAIL_RECOVERY_EXECUTOR_ADDRESS,
			guardian_email_addr: guardianEmail,
			account_code: accountCode,
			template_idx: templateIdx,
			command: handleAcceptanceCommand,
		}),
	})

	return await response.json()
}

export async function checkAcceptanceRequest(
	client: JsonRpcProvider,
	accountAddress: string,
	validatorAddress: string,
) {
	const contract = new Contract(
		EMAIL_RECOVERY_EXECUTOR_ADDRESS,
		['function canStartRecoveryRequest(address account, address validator) view returns (bool)'],
		client,
	)
	return await contract.canStartRecoveryRequest(accountAddress, validatorAddress)
}

export async function recoveryCommandTemplates(client: JsonRpcProvider) {
	try {
		const contract = new Contract(
			EMAIL_RECOVERY_EXECUTOR_ADDRESS,
			['function recoveryCommandTemplates() view returns (string[][])'],
			client,
		)
		return await contract.recoveryCommandTemplates()
	} catch (e) {
		throw new Error('Failed to get recovery command templates', { cause: e })
	}
}

export async function sendRecoveryRequest({
	client,
	accountAddress,
	guardianEmail,
	newOwner,
}: {
	client: JsonRpcProvider
	accountAddress: string
	guardianEmail: string
	newOwner: string
}) {
	// Get recovery command templates
	const templates = await recoveryCommandTemplates(client)

	// Create recovery data
	const addOwnerAction = await OwnableValidatorAPI.encodeAddOwner(client, accountAddress, newOwner)

	const recoveryData = abiEncode(['address', 'bytes'], [ADDRESS.OwnableValidator, addOwnerAction])

	// Create recovery command from template
	const templateIdx = 0
	const { keccak256 } = await import('ethers')
	const handleRecoveryCommand = (templates[0] as string[])
		.join(' ')
		.replace('{ethAddr}', accountAddress)
		.replace('{string}', keccak256(recoveryData))

	// Send recovery request to relayer
	const response = await fetch(`${EMAIL_RELAYER_URL_BASE_SEPOLIA}/recoveryRequest`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			controller_eth_addr: EMAIL_RECOVERY_EXECUTOR_ADDRESS,
			guardian_email_addr: guardianEmail,
			template_idx: templateIdx,
			command: handleRecoveryCommand,
		}),
	})

	return await response.json()
}

export async function getRecoveryRequest({
	client,
	accountAddress,
}: {
	client: JsonRpcProvider
	accountAddress: string
}): Promise<{
	executeAfter: bigint
	executeBefore: bigint
	currentWeight: bigint
	recoveryDataHash: string
}> {
	try {
		const contract = new Contract(
			EMAIL_RECOVERY_EXECUTOR_ADDRESS,
			['function getRecoveryRequest(address account) view returns (uint256, uint256, uint256, bytes32)'],
			client,
		)
		const result = await contract.getRecoveryRequest(accountAddress)
		return {
			executeAfter: BigInt(result[0]),
			executeBefore: BigInt(result[1]),
			currentWeight: BigInt(result[2]),
			recoveryDataHash: result[3] as string,
		}
	} catch (e) {
		throw new Error('Failed to get recovery request', { cause: e })
	}
}

export async function isRecoveryRequestExists(client: JsonRpcProvider, accountAddress: string) {
	const { executeAfter } = await getRecoveryRequest({
		client,
		accountAddress,
	})
	return executeAfter !== 0n
}

/**
 * @returns The recovery delay in seconds
 */
export async function getRecoveryTimeLeft(client: JsonRpcProvider, accountAddress: string): Promise<bigint> {
	const { executeAfter } = await getRecoveryRequest({
		client,
		accountAddress,
	})
	if (executeAfter === 0n) {
		throw new Error('Recovery request for account not found')
	}

	const block = await client.getBlock('latest')
	if (!block) {
		throw new Error('Failed to get latest block')
	}

	return executeAfter - BigInt(block.timestamp)
}

export async function completeRecovery(client: JsonRpcProvider, accountAddress: string, newOwner: string) {
	// Get recovery request
	const { executeAfter } = await getRecoveryRequest({
		client,
		accountAddress,
	})

	// Check if recovery request exists
	if (executeAfter === 0n) {
		throw new Error('Recovery request for account not found')
	}

	// Check if recovery delay has passed
	const block = await client.getBlock('latest')
	if (!block) {
		throw new Error('Failed to get latest block')
	}

	if (block.timestamp < executeAfter) {
		const timeLeft = executeAfter - BigInt(block.timestamp)
		throw new Error(`Recovery delay has not passed. You have ${timeLeft / 60n} minutes left.`)
	}

	// Create recovery data
	const addOwnerAction = await OwnableValidatorAPI.encodeAddOwner(client, accountAddress, newOwner)

	const recoveryData = abiEncode(['address', 'bytes'], [ADDRESS.OwnableValidator, addOwnerAction])

	const response = await fetch(`${EMAIL_RELAYER_URL_BASE_SEPOLIA}/completeRequest`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			controller_eth_addr: EMAIL_RECOVERY_EXECUTOR_ADDRESS,
			account_eth_addr: accountAddress,
			complete_calldata: recoveryData,
		}),
	})

	return await response.json()
}
