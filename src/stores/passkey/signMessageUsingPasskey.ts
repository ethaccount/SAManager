import { decodeBase64URL } from '@/lib/helper'
import { p256 } from '@noble/curves/p256'
import { startAuthentication } from '@simplewebauthn/browser'
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/typescript-types'
import { AbiCoder, encodeBase64, getBytes, hexlify, isHexString, keccak256, toUtf8Bytes } from 'ethers'

// Modified from zerodev-sdk signMessageUsingWebAuthn
export async function signMessageUsingPasskey(
	message: string,
	allowCredentials?: PublicKeyCredentialRequestOptionsJSON['allowCredentials'],
) {
	let hash = message
	if (!isHexString(message)) {
		hash = keccak256(getBytes(toUtf8Bytes(message)))
	}

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
