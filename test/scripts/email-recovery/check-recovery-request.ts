import { getRecoveryTimeLeft, isRecoveryRequestExists } from '@/features/email-recovery'
import { JsonRpcProvider } from 'ethers'
import { alchemy } from 'evm-providers'

const { ALCHEMY_API_KEY = '' } = process.env

if (!ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}

const CHAIN_ID = 84532
const ACCOUNT_ADDRESS = '0x10C6190A1bf09b157C1f0B99119872ef3f0A7C8f'

const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)

const client = new JsonRpcProvider(rpcUrl)

const result = await isRecoveryRequestExists(client, ACCOUNT_ADDRESS)
console.log(result)

const delay = await getRecoveryTimeLeft(client, ACCOUNT_ADDRESS)
console.log(Number(delay / 60n), 'minutes')
