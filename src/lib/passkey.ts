import { decodeBase64, encodeBase64, getBytes, hexlify, isHexString, keccak256, toUtf8Bytes } from 'ethers'
import { PASSKEY_RP_URL } from '@/config'
import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/typescript-types'
import { AbiCoder } from 'ethers'
import { p256 } from '@noble/curves/p256'

const credentials = 'include'

/**
 * Modified from zerodev sdk toWebAuthnKey()
 */
export async function register(username: string) {
	// Get registration options
	const registerOptionsResponse = await fetch(`${PASSKEY_RP_URL}/register/options`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ username }),
		credentials,
	})
	const registerOptions = await registerOptionsResponse.json()
	console.log('registration optinos', registerOptions)

	// Start registration
	const registerCred = await startRegistration(registerOptions.options)

	const authenticatorId = registerCred.id
	console.log('authenticatorId', authenticatorId)

	// Verify registration
	const registerVerifyResponse = await fetch(`${PASSKEY_RP_URL}/register/verify`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			userId: registerOptions.userId,
			username,
			cred: registerCred,
		}),
		credentials,
	})

	const registerVerifyResult = await registerVerifyResponse.json()
	if (!registerVerifyResult.verified) {
		throw new Error('Registration not verified')
	}

	const pubKey = registerCred.response.publicKey
	console.log('pubKey', pubKey)

	if (!pubKey) {
		throw new Error('No public key returned from registration credential')
	}
	if (!authenticatorId) {
		throw new Error('No authenticator id returned from registration credential')
	}

	const authenticatorIdHash = keccak256(decodeBase64URL(authenticatorId))

	const spkiDer = Buffer.from(pubKey, 'base64')
	const key = await crypto.subtle.importKey(
		'spki',
		spkiDer,
		{
			name: 'ECDSA',
			namedCurve: 'P-256',
		},
		true,
		['verify'],
	)

	// Export the key to the raw format
	const rawKey = await crypto.subtle.exportKey('raw', key)
	const rawKeyBuffer = Buffer.from(rawKey)

	// The first byte is 0x04 (uncompressed), followed by x and y coordinates (32 bytes each for P-256)
	const pubKeyX = rawKeyBuffer.subarray(1, 33).toString('hex')
	const pubKeyY = rawKeyBuffer.subarray(33).toString('hex')

	return {
		pubX: BigInt(`0x${pubKeyX}`),
		pubY: BigInt(`0x${pubKeyY}`),
		authenticatorId,
		authenticatorIdHash,
	}
}

/**
 * Modified from zerodev sdk toWebAuthnKey()
 */
export async function login() {
	// Get login options
	const loginOptionsResponse = await fetch(`${PASSKEY_RP_URL}/login/options`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},

		credentials,
	})
	const loginOptions = await loginOptionsResponse.json()

	// Start authentication (login)
	const loginCred = await startAuthentication(loginOptions)

	const authenticatorId = loginCred.id
	console.log('authenticatorId', authenticatorId)

	// Verify authentication
	const loginVerifyResponse = await fetch(`${PASSKEY_RP_URL}/login/verify`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ cred: loginCred }),
		credentials,
	})

	const loginVerifyResult = await loginVerifyResponse.json()

	if (loginVerifyResult.error) {
		throw new Error(loginVerifyResult.error)
	}

	if (!loginVerifyResult.verification.verified) {
		throw new Error('Login not verified')
	}
	// Import the key
	const pubKey = loginVerifyResult.pubkey // Uint8Array pubkey

	console.log('pubKey', pubKey)

	if (!pubKey) {
		throw new Error('No public key returned from registration credential')
	}
	if (!authenticatorId) {
		throw new Error('No authenticator id returned from registration credential')
	}

	const authenticatorIdHash = keccak256(decodeBase64URL(authenticatorId))

	const spkiDer = Buffer.from(pubKey, 'base64')
	const key = await crypto.subtle.importKey(
		'spki',
		spkiDer,
		{
			name: 'ECDSA',
			namedCurve: 'P-256',
		},
		true,
		['verify'],
	)

	// Export the key to the raw format
	const rawKey = await crypto.subtle.exportKey('raw', key)
	const rawKeyBuffer = Buffer.from(rawKey)

	// The first byte is 0x04 (uncompressed), followed by x and y coordinates (32 bytes each for P-256)
	const pubKeyX = rawKeyBuffer.subarray(1, 33).toString('hex')
	const pubKeyY = rawKeyBuffer.subarray(33).toString('hex')

	return {
		pubX: BigInt(`0x${pubKeyX}`),
		pubY: BigInt(`0x${pubKeyY}`),
		authenticatorId,
		authenticatorIdHash,
	}
}

function decodeBase64URL(base64UrlString: string) {
	// Replace URL-specific characters and pad with '=' to match Base64 format
	let base64 = base64UrlString.replace(/-/g, '+').replace(/_/g, '/')
	while (base64.length % 4 !== 0) {
		base64 += '='
	}

	// Decode using ethers' decodeBase64 method
	return decodeBase64(base64)
}

// Modified from zerodev-sdk signMessageUsingWebAuthn
export async function signMessage(
	message: string,
	allowCredentials?: PublicKeyCredentialRequestOptionsJSON['allowCredentials'],
) {
	let hash = message
	if (!isHexString(message)) {
		hash = keccak256(getBytes(toUtf8Bytes(message)))
	}
	console.log(hash)

	const challenge = encodeBase64(getBytes(hash))

	// prepare assertion options
	const assertionOptions: PublicKeyCredentialRequestOptionsJSON = {
		challenge,
		allowCredentials,
		userVerification: 'required',
	}

	// start authentication (signing)
	const cred = await startAuthentication(assertionOptions)

	// get authenticator data
	const { authenticatorData } = cred.response
	const authenticatorDataHex = hexlify(decodeBase64URL(authenticatorData))

	// get client data JSON
	const clientDataJSON = atob(cred.response.clientDataJSON)

	const findQuoteIndices = (input: string): { beforeType: bigint; beforeChallenge: bigint } => {
		const beforeTypeIndex = BigInt(input.lastIndexOf('"type":"webauthn.get"'))
		const beforeChallengeIndex = BigInt(input.indexOf('"challenge'))
		return {
			beforeType: beforeTypeIndex,
			beforeChallenge: beforeChallengeIndex,
		}
	}
	// get challenge and response type location
	const { beforeType } = findQuoteIndices(clientDataJSON)

	// get signature r,s
	const { signature } = cred.response
	const signatureHex = hexlify(decodeBase64URL(signature))

	const { r, s } = parseAndNormalizeSig(signatureHex)
	// Parse DER-encoded P256-SHA256 signature to contract-friendly signature
	// and normalize it so the signature is not malleable.
	function parseAndNormalizeSig(derSig: string): { r: bigint; s: bigint } {
		const parsedSignature = p256.Signature.fromDER(derSig.slice(2))
		const bSig = getBytes(`0x${parsedSignature.toCompactHex()}`)
		// assert(bSig.length === 64, "signature is not 64 bytes");
		const bR = bSig.slice(0, 32)
		const bS = bSig.slice(32)

		// Avoid malleability. Ensure low S (<= N/2 where N is the curve order)
		const r = BigInt(hexlify(bR))
		let s = BigInt(hexlify(bS))
		const n = BigInt('0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551')
		if (s > n / 2n) {
			s = n - s
		}
		return { r, s }
	}

	const abiCoder = new AbiCoder()
	const encodedSignature = abiCoder.encode(
		['bytes', 'string', 'uint256', 'uint256', 'uint256', 'bool'],
		[authenticatorDataHex, clientDataJSON, beforeType, BigInt(r), BigInt(s), false],
	)

	return encodedSignature
}
