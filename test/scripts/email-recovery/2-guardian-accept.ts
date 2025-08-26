import { sendAcceptanceRequest } from '@/lib/email-recovery'
import { JsonRpcProvider } from 'ethers'
import { alchemy } from 'evm-providers'

// https://docs.zk.email/account-recovery/module-sdk-guide#handling-acceptance

const { ALCHEMY_API_KEY = '' } = process.env

if (!ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}

const CHAIN_ID = 84532
const ACCOUNT_ADDRESS = '0x10C6190A1bf09b157C1f0B99119872ef3f0A7C8f'
const GUARDIAN_EMAIL = 'johnson86tw@gmail.com'
const ACCOUNT_CODE = '0ba5ec184e662a7a99c89ba7ca622e3dfcd1e8de8345ce5846f44c3dd00a4ac6'

const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)

const client = new JsonRpcProvider(rpcUrl)

const data = await sendAcceptanceRequest(client, GUARDIAN_EMAIL, ACCOUNT_ADDRESS, ACCOUNT_CODE)
console.log('data:', data)
