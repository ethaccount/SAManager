import { KeyStorage } from './KeyStorage'

describe('KeyStorage', () => {
	let storage: KeyStorage

	beforeEach(() => {
		storage = new KeyStorage()
	})

	it('should store and retrieve keys', () => {
		storage.set('testKey', 'testValue')
		expect(storage.get('testKey')).toBe('testValue')
	})

	it('should return null for non-existent keys', () => {
		expect(storage.get('nonExistent')).toBeNull()
	})

	it('should NOT persist data across instances (memory-only)', () => {
		storage.set('persistKey', 'persistValue')

		const newStorage = new KeyStorage()
		expect(newStorage.get('persistKey')).toBeNull()
	})

	it('should clear all data', () => {
		storage.set('key1', 'value1')
		storage.set('key2', 'value2')

		storage.clear()

		expect(storage.get('key1')).toBeNull()
		expect(storage.get('key2')).toBeNull()
	})

	it('should handle null values', () => {
		storage.set('nullKey', null)
		expect(storage.get('nullKey')).toBeNull()
	})

	it('should overwrite existing keys', () => {
		storage.set('key', 'value1')
		storage.set('key', 'value2')
		expect(storage.get('key')).toBe('value2')
	})

	it('should be fast (no I/O operations)', () => {
		const start = performance.now()

		// Perform many operations
		for (let i = 0; i < 1000; i++) {
			storage.set(`key${i}`, `value${i}`)
			storage.get(`key${i}`)
		}

		const end = performance.now()
		const duration = end - start

		// Should complete very quickly (< 10ms for 1000 operations)
		expect(duration).toBeLessThan(10)
	})
})
