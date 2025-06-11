import { AccountId, SUPPORTED_ACCOUNTS } from '@/stores/account/account'
import { hexlify, JsonRpcProvider, randomBytes } from 'ethers'
import {
	ADDRESS,
	Bundler,
	createUserOp,
	ERC7579Validator,
	formatUserOpToHex,
	getSmartSessionUseModeSignature,
	INTERFACES,
	KernelV3Account,
	KernelValidationType,
	OperationGetter,
	NexusAccount,
	Safe7579Account,
	zeroBytes,
} from 'sendop'

export async function registerJob({
	accountId,
	permissionId,
	accountAddress,
	jobId,
	client,
	bundler,
}: {
	accountId: AccountId
	permissionId: string
	accountAddress: string
	jobId: bigint
	client: JsonRpcProvider
	bundler: Bundler
}) {
	const validator: ERC7579Validator = {
		address: () => ADDRESS.SmartSession,
		getDummySignature: () => '0x',
		getSignature: () => {
			return '0x'
		},
	}

	const opGetter = getModularAccountInstance({
		accountId,
		accountAddress,
		client,
		bundler,
		validator,
		isRandomNonceKey: true,
	})

	if (!opGetter) {
		throw new Error(`Unsupported account ID: ${accountId}`)
	}

	const userOp = await createUserOp(
		bundler,
		[
			{
				to: ADDRESS.ScheduledTransfers,
				value: 0n,
				data: INTERFACES.ScheduledTransfers.encodeFunctionData('executeOrder', [jobId]),
			},
		],
		opGetter,
	)

	userOp.signature = getSmartSessionUseModeSignature(permissionId, '0x')

	console.log('jobId', jobId)
	console.log('permissionId', permissionId)

	const entryPointVersion = SUPPORTED_ACCOUNTS[accountId].entryPointVersion
	console.log('entrypoint version', entryPointVersion)

	let epAddress = ''

	switch (entryPointVersion) {
		case 'v0.7':
			epAddress = ADDRESS.EntryPointV07
			break
		case 'v0.8':
			epAddress = ADDRESS.EntryPointV08
			break
		default:
			throw new Error(`Unsupported entrypoint version: ${entryPointVersion}`)
	}

	console.log('entrypoint address', epAddress)

	console.log('Permissioned user op', formatUserOpToHex(userOp))

	// Get chain ID from the client
	const network = await client.getNetwork()
	const chainId = Number(network.chainId)

	const formattedUserOp = formatUserOpToHex(userOp)

	// Register the job with the API
	const response = await fetch('/backend/jobs', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			accountAddress,
			chainId,
			jobId: Number(jobId),
			entryPoint: epAddress,
			userOperation: formattedUserOp,
		}),
	})

	if (!response.ok) {
		throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
	}

	const result = await response.json()

	// Check API response format
	if (result.code !== 0) {
		throw new Error(`API error: ${result.message}${result.error ? ` - ${JSON.stringify(result.error)}` : ''}`)
	}

	console.log('Job registered successfully:', result.data)

	return result.data
}

function getModularAccountInstance({
	accountId,
	accountAddress,
	client,
	bundler,
	validator,
	isRandomNonceKey = false,
}: {
	accountId: AccountId
	accountAddress: string
	client: JsonRpcProvider
	bundler: Bundler
	validator: ERC7579Validator
	isRandomNonceKey?: boolean
}): OperationGetter | null {
	switch (accountId) {
		case 'kernel.advanced.v0.3.1':
			return new KernelV3Account({
				address: accountAddress,
				client,
				bundler,
				nonce: {
					type: KernelValidationType.VALIDATOR,
					key: isRandomNonceKey ? hexlify(randomBytes(2)) : zeroBytes(2),
				},
				validator,
			})
		case 'biconomy.nexus.1.0.2':
			return new NexusAccount({
				address: accountAddress,
				client,
				bundler,
				validator,
				nonce: {
					key: isRandomNonceKey ? hexlify(randomBytes(3)) : zeroBytes(3),
				},
			})
		case 'rhinestone.safe7579.v1.0.0':
			if (isRandomNonceKey) {
				return null
			}
			return new Safe7579Account({
				address: accountAddress,
				client,
				bundler,
				validator,
			})
		default:
			return null
	}
}
