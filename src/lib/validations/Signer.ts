import { UserOpBuilder } from 'ethers-erc4337'

export type SignerType = 'EOAWallet' | 'Passkey'

export interface AppSigner {
	type: SignerType
	identifier: string
	sign(userOp: UserOpBuilder): Promise<string>
}
