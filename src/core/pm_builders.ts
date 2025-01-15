import type { GetPaymasterDataResult, GetPaymasterStubDataResult, PaymasterBuilder, UserOp } from 'sendop'
import { ENTRY_POINT_V07, RpcProvider } from 'sendop'
import { Contract, JsonRpcProvider, toBeHex } from 'ethers'
import { CHARITY_PAYMASTER } from '@/config'

const CHARITY_PAYMASTER_ADDRESS = CHARITY_PAYMASTER

export class MyPaymaster implements PaymasterBuilder {
	chainId: string
	clientUrl: string
	#client: JsonRpcProvider
	#paymasterAddress: string
	#paymaster: Contract

	constructor(options: { chainId: string; clientUrl: string; paymasterAddress: string }) {
		this.chainId = options.chainId
		this.clientUrl = options.clientUrl
		this.#client = new JsonRpcProvider(options.clientUrl)
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

export class PimlicoPaymaster implements PaymasterBuilder {
	chainId: string
	paymaster: RpcProvider

	constructor(options: { chainId: string; url: string }) {
		this.chainId = options.chainId
		this.paymaster = new RpcProvider(options.url)
	}

	async getPaymasterStubData(userOp: UserOp): Promise<GetPaymasterStubDataResult> {
		return this.paymaster.send({
			method: 'pm_getPaymasterStubData',
			params: [
				userOp,
				ENTRY_POINT_V07,
				toBeHex(this.chainId),
				{
					sponsorshipPolicyId: 'sp_superb_timeslip',
				},
			],
		})
	}

	async getPaymasterData(userOp: UserOp): Promise<GetPaymasterDataResult> {
		return this.paymaster.send({
			method: 'pm_getPaymasterData',
			params: [
				userOp,
				ENTRY_POINT_V07,
				toBeHex(this.chainId),
				{
					sponsorshipPolicyId: 'sp_superb_timeslip',
				},
			],
		})
	}
}
