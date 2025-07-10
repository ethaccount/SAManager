export function decodeBase64URL(base64UrlString: string) {
	// Convert base64url to base64
	base64UrlString = base64UrlString.replace(/-/g, '+').replace(/_/g, '/')
	while (base64UrlString.length % 4) base64UrlString += '='
	// Decode
	const binary = atob(base64UrlString)
	return Uint8Array.from(binary, c => c.charCodeAt(0))
}

export function encodeBase64URL(data: Uint8Array): string {
	// Convert Uint8Array to binary string
	const binary = Array.from(data, byte => String.fromCharCode(byte)).join('')
	// Encode to base64
	const base64 = btoa(binary)
	// Convert base64 to base64url
	return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
