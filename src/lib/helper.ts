export function decodeBase64URL(base64UrlString: string) {
	// Convert base64url to base64
	base64UrlString = base64UrlString.replace(/-/g, '+').replace(/_/g, '/')
	while (base64UrlString.length % 4) base64UrlString += '='
	// Decode
	const binary = atob(base64UrlString)
	return Uint8Array.from(binary, c => c.charCodeAt(0))
}
