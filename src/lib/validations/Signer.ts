import { UserOpBuilder } from 'ethers-erc4337'

export type SignerType = 'EOAWallet' | 'Passkey'

export interface Signer {
	type: SignerType
	identifier: string
	sign(userop: UserOpBuilder): Promise<string>
}
