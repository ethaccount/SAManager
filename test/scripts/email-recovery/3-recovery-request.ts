import { sendRecoveryRequest } from '@/lib/email-recovery'
import { JsonRpcProvider } from 'ethers'
import { alchemy } from 'evm-providers'

// https://docs.zk.email/account-recovery/module-sdk-guide#handling-recovery
// https://github.com/zkemail/email-recovery-example-scripts/blob/main/src/module-sdk/3_handleRecovery.ts

const { ALCHEMY_API_KEY = '' } = process.env

if (!ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}

const CHAIN_ID = 84532
const ACCOUNT_ADDRESS = '0x10C6190A1bf09b157C1f0B99119872ef3f0A7C8f'
const GUARDIAN_EMAIL = 'johnson86tw@gmail.com'
const NEW_OWNER = '0xd78B5013757Ea4A7841811eF770711e6248dC282'

const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
const client = new JsonRpcProvider(rpcUrl)

const data = await sendRecoveryRequest({
	client,
	accountAddress: ACCOUNT_ADDRESS,
	guardianEmail: GUARDIAN_EMAIL,
	newOwnerAddress: NEW_OWNER,
})

console.log(data)
