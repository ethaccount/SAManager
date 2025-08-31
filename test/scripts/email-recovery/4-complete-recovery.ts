import { completeRecovery } from '@/lib/email-recovery'
import { JsonRpcProvider } from 'ethers'
import { alchemy } from 'evm-providers'

// https://docs.zk.email/account-recovery/module-sdk-guide#completing-the-recovery
// https://github.com/zkemail/email-recovery-example-scripts/blob/main/src/module-sdk/4_completeRecovery.ts

const { ALCHEMY_API_KEY = '' } = process.env

if (!ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}

const CHAIN_ID = 84532
const ACCOUNT_ADDRESS = '0x10C6190A1bf09b157C1f0B99119872ef3f0A7C8f'
const NEW_OWNER = '0xd78B5013757Ea4A7841811eF770711e6248dC282'

const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
const client = new JsonRpcProvider(rpcUrl)

const data = await completeRecovery(client, ACCOUNT_ADDRESS, NEW_OWNER)
console.log('data:', data)
