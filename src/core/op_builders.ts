import type { Execution, OperationBuilder } from 'sendop'
import type { AccountCreatingVendor, ERC7579Vendor, Validator, Vendor } from 'sendop'
import { ENTRY_POINT_V07 } from 'sendop'
import { Contract, ContractRunner, JsonRpcProvider, toBeHex } from 'ethers'

export function getEntryPointContract(runner: ContractRunner) {
	return new Contract(
		ENTRY_POINT_V07,
		[
			'function getUserOpHash(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes paymasterAndData, bytes signature) userOp) external view returns (bytes32)',
			'function getNonce(address sender, uint192 key) external view returns (uint256 nonce)',
			'function handleOps(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes paymasterAndData, bytes signature)[] ops, address payable beneficiary) external',
			'function depositTo(address account)',
		],
		runner,
	)
}

export class OpBuilder implements OperationBuilder {
	#client: JsonRpcProvider
	#vendor: Vendor | ERC7579Vendor | AccountCreatingVendor
	#validator: Validator
	#from: string
	#isCreation: boolean

	constructor(options: {
		client: JsonRpcProvider
		vendor: Vendor | ERC7579Vendor | AccountCreatingVendor
		validator: Validator
		from: string
		isCreation?: boolean
	}) {
		this.#client = options.client
		this.#vendor = options.vendor
		this.#validator = options.validator
		this.#from = options.from
		this.#isCreation = options.isCreation ?? false
	}

	async getInitCode() {
		if (this.#isCreation && 'getInitCode' in this.#vendor) {
			return await this.#vendor.getInitCode()
		}
		return '0x'
	}

	async getNonce() {
		const nonceKey = await this.#vendor.getNonceKey(await this.#validator.address())
		const nonce: bigint = await getEntryPointContract(this.#client).getNonce(this.#from, nonceKey)
		return toBeHex(nonce)
	}

	async getCallData(executions: Execution[]) {
		return await this.#vendor.getCallData(this.#from, executions)
	}

	async getDummySignature() {
		return await this.#validator.getDummySignature()
	}

	async getSignature(userOpHash: string) {
		return await this.#validator.getSignature(userOpHash)
	}
}
