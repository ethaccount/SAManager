import { checkAcceptanceRequest } from '@/features/email-recovery'
import { JsonRpcProvider } from 'ethers'
import { alchemy } from 'evm-providers'

const { ALCHEMY_API_KEY = '' } = process.env

if (!ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}

const CHAIN_ID = 84532
const ACCOUNT_ADDRESS = '0x5a3F54C7B3B1097E1033176bA9267f485a3a7625'
const VALIDATOR_ADDRESS = '0x2483DA3A338895199E5e538530213157e931Bf06'

const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)

const client = new JsonRpcProvider(rpcUrl)

const result = await checkAcceptanceRequest(client, ACCOUNT_ADDRESS, VALIDATOR_ADDRESS)
console.log(result)
