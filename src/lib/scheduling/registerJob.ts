import { AccountId, SUPPORTED_ACCOUNTS } from '@/stores/account/account'
import { JsonRpcProvider } from 'ethers'
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

	let opGetter: OperationGetter

	switch (accountId) {
		case 'kernel.advanced.v0.3.1':
			opGetter = new KernelV3Account({
				address: accountAddress,
				client,
				bundler,
				nonce: {
					type: KernelValidationType.VALIDATOR,
				},
				validator,
			})
			break
		// TODO: other accounts
		default:
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
}
