import { decodeBase64URL } from '@/lib/helper'

describe('decodeBase64URL', () => {
	it('should decode a valid base64url string', () => {
		// "hello" in base64url
		const input = 'aGVsbG8'
		const result = decodeBase64URL(input)
		const expected = new Uint8Array([104, 101, 108, 108, 111]) // "hello" as bytes
		expect(result).toEqual(expected)
	})

	it('should handle base64url with padding replacement', () => {
		// "hello world" in base64url (no padding chars)
		const input = 'aGVsbG8gd29ybGQ'
		const result = decodeBase64URL(input)
		const expected = new Uint8Array([104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100])
		expect(result).toEqual(expected)
	})

	it('should handle base64url with - and _ characters', () => {
		// Test string that would have + and / in regular base64
		const input = 'SGVsbG8-V29ybGQ_'
		const result = decodeBase64URL(input)
		expect(result).toBeInstanceOf(Uint8Array)
		expect(result.length).toBeGreaterThan(0)
	})

	it('should handle empty string', () => {
		const result = decodeBase64URL('')
		expect(result).toEqual(new Uint8Array([]))
	})
})
