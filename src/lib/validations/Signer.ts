import { TypedData, UserOpBuilder } from 'sendop'

export type SignerType = 'EOAWallet' | 'Passkey'

export interface AppSigner {
	type: SignerType
	identifier: string
	sign(userOp: UserOpBuilder): Promise<string>
	signHash(hash: Uint8Array): Promise<string>
	signTypedData(typedData: TypedData): Promise<string>
}
