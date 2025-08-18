import type { Address, HexString } from '@/types'

export type Web3Response<M = string> = SuccessResponse<M> | ErrorResponse

export type SuccessResponse<M> = M extends 'connectAndSignIn'
	? {
			method: 'connectAndSignIn'
			result: {
				accounts: Address[]
				message: HexString
				signature: HexString
			}
		}
	: M extends 'addEthereumChain'
		? {
				method: 'addEthereumChain'
				result: {
					isApproved: boolean
					rpcUrl: string
				}
			}
		: M extends 'switchEthereumChain'
			? {
					method: 'switchEthereumChain'
					result: {
						isApproved: boolean
						rpcUrl: string
					}
				}
			: M extends 'requestEthereumAccounts'
				? {
						method: 'requestEthereumAccounts'
						result: Address[]
					}
				: M extends 'watchAsset'
					? {
							method: 'watchAsset'
							result: boolean
						}
					: M extends 'signEthereumMessage'
						? {
								method: 'signEthereumMessage'
								result: HexString
							}
						: M extends 'signEthereumTransaction'
							? {
									method: 'signEthereumTransaction'
									result: HexString
								}
							: M extends 'submitEthereumTransaction'
								? {
										method: 'submitEthereumTransaction'
										result: HexString
									}
								: M extends 'ethereumAddressFromSignedMessage'
									? {
											method: 'ethereumAddressFromSignedMessage'
											result: Address
										}
									: {
											method: M
											result: unknown
										}

export type ErrorResponse = {
	method: unknown
	errorCode?: number
	errorMessage: string
}
