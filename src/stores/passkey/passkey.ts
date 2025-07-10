export type PasskeyCredential = {
	username: string
	credentialId: string
	pubKeyX: string
	pubKeyY: string
}

export function serializePasskeyCredential(value: PasskeyCredential): string {
	return JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? `${v.toString()}n` : v))
}

export function deserializePasskeyCredential(value: string): PasskeyCredential {
	return JSON.parse(value, (_, v) => {
		if (typeof v === 'string' && /^\d+n$/.test(v)) {
			return BigInt(v.slice(0, -1))
		}
		return v
	})
}
