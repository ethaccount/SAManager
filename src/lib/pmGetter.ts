import { CHARITY_PAYMASTER_ADDRESS } from '@/address'
import { Contract, JsonRpcProvider, toBeHex } from 'ethers'
import { GetPaymasterStubDataResult, PaymasterGetter, UserOp } from 'sendop'

export class MyPaymaster implements PaymasterGetter {
	#client: JsonRpcProvider
	#paymasterAddress: string
	#paymaster: Contract

	constructor(options: { client: JsonRpcProvider; paymasterAddress: string }) {
		this.#client = options.client
		this.#paymasterAddress = options.paymasterAddress
		this.#paymaster = new Contract(
			this.#paymasterAddress,
			['function isAllowed(address _address) public view returns (bool)'],
			this.#client,
		)
	}

	async getPaymasterStubData(userOp: UserOp): Promise<GetPaymasterStubDataResult> {
		if (this.#paymasterAddress === CHARITY_PAYMASTER_ADDRESS) {
			return {
				sponsor: {
					name: 'My Wallet',
				},
				paymaster: this.#paymasterAddress,
				paymasterData: '0x',
				paymasterVerificationGasLimit: toBeHex(999_999n),
				paymasterPostOpGasLimit: toBeHex(999_999n),
				isFinal: true,
			}
		}

		// check sender is in allowlist
		const isAllowed = await this.#paymaster.isAllowed(userOp.sender)
		if (!isAllowed) {
			throw new Error('Sender is not in allowlist')
		}

		return {
			sponsor: {
				name: 'My Wallet',
			},
			paymaster: this.#paymasterAddress,
			paymasterData: '0x',
			paymasterVerificationGasLimit: toBeHex(999_999n),
			paymasterPostOpGasLimit: toBeHex(999_999n),
			isFinal: true,
		}
	}
}
