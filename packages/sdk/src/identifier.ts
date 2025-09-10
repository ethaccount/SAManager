export enum CallIdentifierType {
	'op' = 0,
	'tx' = 1,
}

/**
 * identifier (64 bytes): hexType (1) | hash (32) | chainId (8) | 000...00
 */
export function encodeCallIdentifier(identifier: CallIdentifier): string {
	const hexType = toBeHex(identifier.type)
	const hexHash = identifier.hash
	const hexChainId = zeroPadValue(toBeHex(identifier.chainId), 8)
	return zeroPadBytes(concat([hexType, hexHash, hexChainId]), 64)
}

export function decodeCallIdentifier(identifier: string): CallIdentifier {
	const hexType = '0x' + identifier.slice(2).slice(0, 2)
	const hexHash = '0x' + identifier.slice(2).slice(2, 66)
	const hexChainId = '0x' + identifier.slice(2).slice(66, 82)
	return {
		chainId: toBigInt(hexChainId),
		type: Number(hexType),
		hash: hexHash,
	}
}

// Custom utility functions to replace ethers dependencies
function toBeHex(value: number | bigint): string {
	if (typeof value === 'number') {
		return '0x' + value.toString(16).padStart(2, '0')
	}
	return '0x' + value.toString(16)
}

function toBigInt(hexString: string): bigint {
	return BigInt(hexString)
}

function zeroPadValue(hexString: string, byteLength: number): string {
	const hex = hexString.startsWith('0x') ? hexString.slice(2) : hexString
	const targetLength = byteLength * 2
	return '0x' + hex.padStart(targetLength, '0')
}

function concat(arrays: string[]): string {
	return '0x' + arrays.map(arr => (arr.startsWith('0x') ? arr.slice(2) : arr)).join('')
}

function zeroPadBytes(hexString: string, byteLength: number): string {
	const hex = hexString.startsWith('0x') ? hexString.slice(2) : hexString
	const targetLength = byteLength * 2
	return '0x' + hex.padEnd(targetLength, '0')
}

export type CallIdentifier = {
	chainId: bigint
	type: CallIdentifierType
	hash: string
}
