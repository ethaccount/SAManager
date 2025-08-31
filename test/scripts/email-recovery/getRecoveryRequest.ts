import { getRecoveryRequest } from '@/lib/email-recovery/utils'
import { JsonRpcProvider } from 'ethers'
import { alchemy } from 'evm-providers'

const { ALCHEMY_API_KEY = '' } = process.env

if (!ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}

const CHAIN_ID = 84532
const ACCOUNT_ADDRESS = '0xAcc339189ea52020E6801d448ecA8c958C60041a'

const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)

const client = new JsonRpcProvider(rpcUrl)

const result = await getRecoveryRequest({ client, accountAddress: ACCOUNT_ADDRESS })
console.log(result)
