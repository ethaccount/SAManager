import { p256 } from '@noble/curves/p256'
import { AbiCoder, getBytes, hexlify, isHexString, keccak256, toUtf8Bytes } from 'ethers'

export async function signMessageUsingPasskey(message: string) {
	let hash = message
	if (!isHexString(message)) {
		hash = keccak256(getBytes(toUtf8Bytes(message)))
	}

	const publicKey: PublicKeyCredentialRequestOptions = {
		challenge: getBytes(hash),
		// rpId,
		// allowCredentials: [{ id: Buffer.from(credentialId, 'base64'), type: 'public-key' }],
		userVerification: 'required', // or 'discouraged' so user doesn't have to touch the passkey
	}

	// start authentication
	const assertion = await navigator.credentials.get({ publicKey })

	if (!assertion) {
		throw new Error('[signMessageUsingPasskey] No assertion')
	}

	const response: AuthenticatorAssertionResponse = (assertion as PublicKeyCredential)
		.response as AuthenticatorAssertionResponse

	const authenticatorDataHex = hexlify(new Uint8Array(response.authenticatorData))
	const clientDataJSON = new TextDecoder().decode(response.clientDataJSON)

	// get challenge and response type location
	const { beforeType } = findQuoteIndices(clientDataJSON)

	function findQuoteIndices(input: string): { beforeType: bigint; beforeChallenge: bigint } {
		const beforeTypeIndex = BigInt(input.lastIndexOf('"type":"webauthn.get"'))
		const beforeChallengeIndex = BigInt(input.indexOf('"challenge'))
		return {
			beforeType: beforeTypeIndex,
			beforeChallenge: beforeChallengeIndex,
		}
	}

	// get signature r,s - use proper signature handling
	const signatureHex = hexlify(new Uint8Array(response.signature))

	return formatSignature(authenticatorDataHex, clientDataJSON, beforeType, signatureHex)
}

export function formatSignature(
	authenticatorDataHex: string,
	clientDataJSON: string,
	beforeType: bigint,
	signatureHex: string,
): string {
	const { r, s } = parseAndNormalizeSig(signatureHex)

	const abiCoder = new AbiCoder()
	const encodedSignature = abiCoder.encode(
		['bytes', 'string', 'uint256', 'uint256', 'uint256', 'bool'],
		[authenticatorDataHex, clientDataJSON, beforeType, BigInt(r), BigInt(s), false],
	)

	return encodedSignature
}

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
