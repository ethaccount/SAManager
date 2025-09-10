import { type CallIdentifier, decodeCallIdentifier, encodeCallIdentifier } from './identifier'

describe('identifier', () => {
	describe('encodeCallIdentifier', () => {
		it('should encode identifier with type 0 (op)', () => {
			const identifier: CallIdentifier = {
				chainId: 1n,
				type: 0,
				hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
			}

			const encoded = encodeCallIdentifier(identifier)

			// Should be exactly 130 chars (0x + 128 hex chars = 64 bytes)
			expect(encoded.length).toBe(130)
			expect(encoded.startsWith('0x')).toBe(true)

			// First byte should be 0x00 (type 0)
			expect(encoded.slice(2, 4)).toBe('00')
		})

		it('should encode identifier with type 1 (tx)', () => {
			const identifier: CallIdentifier = {
				chainId: 1n,
				type: 1,
				hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
			}

			const encoded = encodeCallIdentifier(identifier)

			// First byte should be 0x01 (type 1)
			expect(encoded.slice(2, 4)).toBe('01')
		})

		it('should encode identifier with different chain IDs', () => {
			const testCases = [
				{ chainId: 1n, expected: '0000000000000001' }, // Mainnet
				{ chainId: 137n, expected: '0000000000000089' }, // Polygon
				{ chainId: 11155111n, expected: '0000000000aa36a7' }, // Sepolia
				{ chainId: 0xffffffffffffffffn, expected: 'ffffffffffffffff' }, // Max 8-byte value
			]

			testCases.forEach(({ chainId, expected }) => {
				const identifier: CallIdentifier = {
					chainId,
					type: 0,
					hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
				}

				const encoded = encodeCallIdentifier(identifier)

				// Chain ID should be at positions 66-82 (32 bytes after type + hash)
				const chainIdHex = encoded.slice(2).slice(66, 82)
				expect(chainIdHex).toBe(expected)
			})
		})

		it('should handle random hashes correctly', () => {
			const identifier: CallIdentifier = {
				chainId: 1n,
				type: 0,
				hash: '0x216eeaa0613fa3ef406a9974d4c92c6873e9dbb9d88aa8395f8467dd968876c8',
			}

			const encoded = encodeCallIdentifier(identifier)

			// Hash should be at positions 2-66 (after type byte)
			const hashInEncoded = '0x' + encoded.slice(4, 68)
			expect(hashInEncoded).toBe(identifier.hash)
		})
	})

	describe('decodeCallIdentifier', () => {
		it('should decode identifier correctly', () => {
			const original: CallIdentifier = {
				chainId: 11155111n,
				type: 1,
				hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
			}

			const encoded = encodeCallIdentifier(original)
			const decoded = decodeCallIdentifier(encoded)

			expect(decoded.chainId).toBe(original.chainId)
			expect(decoded.type).toBe(original.type)
			expect(decoded.hash).toBe(original.hash)
		})

		it('should decode both operation and transaction types', () => {
			const testCases = [{ type: 0 }, { type: 1 }]

			testCases.forEach(({ type }) => {
				const identifier: CallIdentifier = {
					chainId: 1n,
					type: type as 0 | 1,
					hash: '0x216eeaa0613fa3ef406a9974d4c92c6873e9dbb9d88aa8395f8467dd968876c8',
				}

				const encoded = encodeCallIdentifier(identifier)
				const decoded = decodeCallIdentifier(encoded)

				expect(decoded.type).toBe(type)
			})
		})
	})

	describe('round-trip encoding/decoding', () => {
		it('should maintain data integrity through encode/decode cycle', () => {
			const testCases: CallIdentifier[] = [
				{
					chainId: 1n,
					type: 0,
					hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
				},
				{
					chainId: 0xffffffffffffffffn,
					type: 1,
					hash: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
				},
				{
					chainId: 11155111n,
					type: 0,
					hash: '0x216eeaa0613fa3ef406a9974d4c92c6873e9dbb9d88aa8395f8467dd968876c8',
				},
				{
					chainId: 137n,
					type: 1,
					hash: '0x216eeaa0613fa3ef406a9974d4c92c6873e9dbb9d88aa8395f8467dd968876c8',
				},
			]

			testCases.forEach(identifier => {
				const encoded = encodeCallIdentifier(identifier)
				const decoded = decodeCallIdentifier(encoded)

				expect(decoded).toEqual(identifier)
			})
		})

		it('should handle multiple random cases', () => {
			for (let i = 0; i < 10; i++) {
				const identifier: CallIdentifier = {
					chainId: BigInt(Math.floor(Math.random() * 1000000)),
					type: Math.random() < 0.5 ? 0 : 1,
					hash: '0x216eeaa0613fa3ef406a9974d4c92c6873e9dbb9d88aa8395f8467dd968876c8',
				}

				const encoded = encodeCallIdentifier(identifier)
				const decoded = decodeCallIdentifier(encoded)

				expect(decoded).toEqual(identifier)
			}
		})
	})

	describe('format validation', () => {
		it('should produce 64-byte (128 hex char + 0x) encoded output', () => {
			const identifier: CallIdentifier = {
				chainId: 1n,
				type: 0,
				hash: '0x216eeaa0613fa3ef406a9974d4c92c6873e9dbb9d88aa8395f8467dd968876c8',
			}

			const encoded = encodeCallIdentifier(identifier)

			expect(encoded.length).toBe(130) // 0x + 128 hex chars
			expect(encoded.startsWith('0x')).toBe(true)
			expect(/^0x[0-9a-f]{128}$/i.test(encoded)).toBe(true)
		})

		it('should have correct structure: type(1) + hash(32) + chainId(8) + padding', () => {
			const identifier: CallIdentifier = {
				chainId: 0x123456789abcdef0n,
				type: 1,
				hash: '0x1111111111111111111111111111111111111111111111111111111111111111',
			}

			const encoded = encodeCallIdentifier(identifier)

			// Type should be 01
			expect(encoded.slice(2, 4)).toBe('01')

			// Hash should follow type
			expect(encoded.slice(4, 68)).toBe('1111111111111111111111111111111111111111111111111111111111111111')

			// Chain ID should follow hash
			expect(encoded.slice(68, 84)).toBe('123456789abcdef0')

			// Rest should be padded with zeros
			const padding = encoded.slice(84)
			expect(/^0+$/.test(padding)).toBe(true)
		})
	})
})
