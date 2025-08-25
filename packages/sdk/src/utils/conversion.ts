export function uint8ArrayToHex(value: Uint8Array) {
	return [...value].map(b => b.toString(16).padStart(2, '0')).join('')
}

export function hexStringToUint8Array(hexString: string): Uint8Array {
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	return new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => Number.parseInt(byte, 16)))
}

export function bigIntToHex(value: bigint) {
	return '0x' + value.toString(16)
}
