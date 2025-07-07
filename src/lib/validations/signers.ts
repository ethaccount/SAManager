import { signMessageUsingPasskey } from '@/stores/passkey/signMessageUsingPasskey'
import { useEOAWallet } from '@/stores/useEOAWallet'
import { getAddress } from 'ethers'
import { ENTRY_POINT_V07_ADDRESS, ENTRY_POINT_V08_ADDRESS, UserOpBuilder } from 'ethers-erc4337'
import { Signer, SignerType } from './Signer'

export class EOASigner implements Signer {
	type: SignerType = 'EOAWallet'

	constructor(public identifier: string) {
		this.identifier = getAddress(identifier)
	}

	async sign(userop: UserOpBuilder): Promise<string> {
		const { signer } = useEOAWallet()
		if (!signer.value) {
			throw new Error('[EOASigner] No signer selected')
		}

		const entryPointAddress = userop.entryPointAddress

		// Use different signing methods based on entry point version
		switch (entryPointAddress) {
			case ENTRY_POINT_V07_ADDRESS:
				return await signer.value.signMessage(userop.hash())
			case ENTRY_POINT_V08_ADDRESS:
				return await signer.value.signTypedData(...userop.typedData())
			default:
				throw new Error('[EOASigner] Unsupported entry point version')
		}
	}
}

export class PasskeySigner implements Signer {
	type: SignerType = 'Passkey'

	constructor(public identifier: string) {}

	async sign(userop: UserOpBuilder): Promise<string> {
		return await signMessageUsingPasskey(userop.hash())
	}
}
