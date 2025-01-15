import type { Bundler, UserOp, UserOpReceipt } from 'sendop'
import { ENTRY_POINT_V07 } from 'sendop'
import { RpcProvider } from 'sendop'

export class PimlicoBundler implements Bundler {
	chainId: string
	url: string
	bundler: RpcProvider

	constructor(chainId: string, url: string) {
		this.chainId = chainId
		this.url = url
		this.bundler = new RpcProvider(url)
	}

	async getGasValues(userOp: UserOp) {
		const curGasPrice = await this.bundler.send({ method: 'pimlico_getUserOperationGasPrice' })
		// Note: user operation max fee per gas must be larger than 0 during gas estimation
		userOp.maxFeePerGas = curGasPrice.standard.maxFeePerGas
		const estimateGas = await this.bundler.send({
			method: 'eth_estimateUserOperationGas',
			params: [userOp, ENTRY_POINT_V07],
		})

		return {
			maxFeePerGas: userOp.maxFeePerGas,
			maxPriorityFeePerGas: curGasPrice.standard.maxPriorityFeePerGas,
			preVerificationGas: estimateGas.preVerificationGas,
			verificationGasLimit: estimateGas.verificationGasLimit,
			callGasLimit: estimateGas.callGasLimit,
			paymasterVerificationGasLimit: estimateGas.paymasterVerificationGasLimit,
			paymasterPostOpGasLimit: estimateGas.paymasterPostOpGasLimit,
		}
	}

	async sendUserOperation(userOp: UserOp): Promise<string> {
		return await this.bundler.send({
			method: 'eth_sendUserOperation',
			params: [userOp, ENTRY_POINT_V07],
		})
	}

	async getUserOperationReceipt(hash: string): Promise<UserOpReceipt> {
		return await this.bundler.send({ method: 'eth_getUserOperationReceipt', params: [hash] })
	}
}
