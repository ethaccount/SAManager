export function uint8ArrayToHex(value: Uint8Array) {
	return [...value].map(b => b.toString(16).padStart(2, '0')).join('')
}

export function hexStringToUint8Array(hexString: string): Uint8Array {
	return new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => Number.parseInt(byte, 16)))
}
