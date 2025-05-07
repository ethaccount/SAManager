import { StateTree } from 'pinia'

// Utility functions for serializing/deserializing data with BigInt support

export const credentialSerializer = {
	serialize: (value: StateTree): string => {
		return JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? `${v.toString()}n` : v))
	},

	deserialize: (value: string): StateTree => {
		return JSON.parse(value, (_, v) => {
			if (typeof v === 'string' && /^\d+n$/.test(v)) {
				return BigInt(v.slice(0, -1))
			}
			return v
		})
	},
}
