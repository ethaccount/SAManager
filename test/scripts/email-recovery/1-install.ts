import { createOwnableEmailRecovery } from '@/features/email-recovery'
import { getOwnableValidator, RHINESTONE_ATTESTER_ADDRESS } from '@rhinestone/module-sdk'
import { JsonRpcProvider, Wallet } from 'ethers'
import { alchemy, pimlico } from 'evm-providers'
import type { Execution } from 'sendop'
import {
	ADDRESS,
	BICONOMY_ATTESTER_ADDRESS,
	ERC4337Bundler,
	ERC7579_MODULE_TYPE,
	fetchGasPricePimlico,
	NexusAccountAPI,
	NexusAPI,
	PublicPaymaster,
	randomBytes32,
	SingleEOAValidation,
} from 'sendop'
import { executeUserOperation } from '../helpers'

const { ALCHEMY_API_KEY = '', PIMLICO_API_KEY = '', DEV_7702_PK = '' } = process.env

if (!ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}
if (!PIMLICO_API_KEY) {
	throw new Error('PIMLICO_API_KEY is not set')
}
if (!DEV_7702_PK) {
	throw new Error('DEV_7702_PK is not set')
}

const CHAIN_ID = 84532
const GUARDIAN_EMAIL = 'johnson86tw@gmail.com'

const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
const pimlicoUrl = pimlico(CHAIN_ID, PIMLICO_API_KEY)

const client = new JsonRpcProvider(rpcUrl)
const bundler = new ERC4337Bundler(pimlicoUrl)
const signer = new Wallet(DEV_7702_PK)

const ownableValidator = getOwnableValidator({
	owners: [signer.address as `0x${string}`],
	threshold: 1,
})

const { accountAddress, factory, factoryData } = await NexusAPI.getDeployment({
	client,
	creationOptions: {
		bootstrap: 'initNexusWithSingleValidator',
		validatorAddress: ownableValidator.address,
		validatorInitData: ownableValidator.initData,
		registryAddress: ADDRESS.Registry,
		attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
		threshold: 1,
	},
	salt: randomBytes32(),
})
console.log('accountAddress', accountAddress)

const emailModuleData = await createOwnableEmailRecovery({
	client,
	accountAddress,
	email: GUARDIAN_EMAIL,
})

console.log('emailModuleData', emailModuleData)

const executions: Execution[] = [
	{
		to: accountAddress,
		value: 0n,
		data: NexusAPI.encodeInstallModule({
			moduleType: ERC7579_MODULE_TYPE.EXECUTOR,
			moduleAddress: emailModuleData.module.address,
			initData: emailModuleData.module.initData,
		}),
	},
]

const receipt = await executeUserOperation({
	accountAPI: new NexusAccountAPI({
		validation: new SingleEOAValidation(),
		validatorAddress: ownableValidator.address,
	}),
	accountAddress,
	chainId: CHAIN_ID,
	client,
	bundler,
	executions,
	signer,
	paymasterAPI: PublicPaymaster,
	gasPrice: await fetchGasPricePimlico(pimlicoUrl),
	deployment: {
		factory,
		factoryData,
	},
})

console.log(receipt.success)
