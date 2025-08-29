import { signMessageUsingPasskey } from '@/stores/passkey/signMessageUsingPasskey'
import { getAddress, getBytes, hexlify, Signer, TypedDataEncoder } from 'ethers'
import { ENTRY_POINT_V07_ADDRESS, ENTRY_POINT_V08_ADDRESS, TypedData, UserOpBuilder } from 'sendop'
import { AppSigner, SignerType } from './types'

export class EOASigner implements AppSigner {
	type: SignerType = 'EOAWallet'
	private signer: Signer

	constructor(
		public identifier: string, // owner address
		signer: Signer,
	) {
		this.identifier = getAddress(identifier)
		this.signer = signer
	}

	async sign(userop: UserOpBuilder): Promise<string> {
		const entryPointAddress = userop.entryPointAddress

		// Use different signing methods based on entry point version
		switch (entryPointAddress) {
			case ENTRY_POINT_V07_ADDRESS:
				return await this.signer.signMessage(getBytes(userop.hash()))
			case ENTRY_POINT_V08_ADDRESS:
				return await this.signer.signTypedData(...userop.typedData())
			default:
				throw new Error('[EOASigner] Unsupported entry point version')
		}
	}

	async signHash(hash: Uint8Array): Promise<string> {
		return await this.signer.signMessage(hash)
	}

	async signTypedData(typedData: TypedData): Promise<string> {
		return await this.signer.signTypedData(...typedData)
	}
}

export class PasskeySigner implements AppSigner {
	type: SignerType = 'Passkey'

	constructor(public identifier: string) {} // authenticatorIdHash

	async sign(userop: UserOpBuilder): Promise<string> {
		return await signMessageUsingPasskey(userop.hash())
	}

	async signHash(hash: Uint8Array): Promise<string> {
		return await signMessageUsingPasskey(hexlify(hash))
	}

	async signTypedData(typedData: TypedData): Promise<string> {
		return await signMessageUsingPasskey(TypedDataEncoder.hash(...typedData))
	}
}
