import { keccak256 } from 'ethers'
import { v4 as uuidv4, parse as uuidParse } from 'uuid'
import { decodeBase64URL } from '@/lib/helper'

const RP_NAME = 'SAManager Relying Party'
const RP_ID = window.location.hostname

export function getAuthenticatorIdHash(credentialId: string) {
	return keccak256(decodeBase64URL(credentialId))
}

export async function createCredential(username: string) {
	const options: PublicKeyCredentialCreationOptions = {
		rp: {
			name: RP_NAME,
			id: RP_ID,
		},
		user: {
			id: uuidParse(uuidv4()),
			name: username,
			displayName: username,
		},
		challenge: crypto.getRandomValues(new Uint8Array(32)), // must be a BufferSource
		pubKeyCredParams: [
			{ alg: -7, type: 'public-key' },
			{ alg: -257, type: 'public-key' },
		],
		attestation: 'none', // default is 'none'
		excludeCredentials: [],
		authenticatorSelection: {
			residentKey: 'required', // a client-side discoverable credential
			userVerification: 'required', // specifies the requirements for user verification for the create() operation.
			requireResidentKey: true,
		},
		extensions: {
			credProps: true,
		},
	}

	console.log('PublicKeyCredentialCreationOptions', options)

	const credential = (await navigator.credentials.create({ publicKey: options })) as PublicKeyCredential | null
	if (!credential) {
		throw new Error('Failed to create credential')
	}
	console.log('PublicKeyCredential', credential)

	// parse public key

	return {
		credentialId: credential.id,
		pubKeyX: 'a',
		pubKeyY: 'b',
	}
}

export async function getCredential(options: {
	userVerification: 'required' | 'discouraged'
	challenge?: BufferSource
	credentialId?: string
}) {
	const publicKey: PublicKeyCredentialRequestOptions = {
		challenge: options.challenge ?? crypto.getRandomValues(new Uint8Array(32)),
		rpId: RP_ID,
		allowCredentials: options?.credentialId
			? [{ id: Buffer.from(options.credentialId, 'base64url'), type: 'public-key' }]
			: [],
		userVerification: options.userVerification,
	}
	const credential = (await navigator.credentials.get({
		publicKey,
		mediation: 'silent',
	})) as PublicKeyCredential | null

	if (!credential) {
		throw new Error('Failed to get credential')
	}

	const assertionResponse = credential.response as AuthenticatorAssertionResponse

	return {
		credentialId: credential.id,
		signature: assertionResponse.signature,
	}
}
