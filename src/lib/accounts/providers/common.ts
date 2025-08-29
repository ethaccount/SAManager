import { JsonRpcProvider } from 'ethers'
import {
	ERC7579_MODULE_TYPE,
	ERC7579Module,
	findPrevious,
	getExecutorsPaginated,
	getValidatorsPaginated,
	zeroPadLeft,
} from 'sendop'

export async function getPrevModuleAddress(client: JsonRpcProvider, accountAddress: string, module: ERC7579Module) {
	let prev: string
	if (module.type === ERC7579_MODULE_TYPE.VALIDATOR) {
		const { validators } = await getValidatorsPaginated(client, accountAddress, zeroPadLeft('0x01', 20), 10)
		prev = findPrevious(validators, module.address)
	} else if (module.type === ERC7579_MODULE_TYPE.EXECUTOR) {
		const { executors } = await getExecutorsPaginated(client, accountAddress, zeroPadLeft('0x01', 20), 10)
		prev = findPrevious(executors, module.address)
	} else {
		throw new Error(`[getPrevModuleAddress] Unsupported module type ${module.type}`)
	}
	return prev
}
