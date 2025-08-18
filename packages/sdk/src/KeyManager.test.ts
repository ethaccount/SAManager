import { KeyManager } from './KeyManager'
import { generateKeyPair } from './utils'
import { keyStorage } from './KeyStorage'

describe('KeyStorage', () => {
	let keyManager: KeyManager

	beforeEach(() => {
		// Clear keyStorage to ensure clean state for each test
		keyStorage.clear()
		keyManager = new KeyManager()
	})

	describe('getOwnPublicKey', () => {
		it('should return the own public key', async () => {
			const publicKey = await keyManager.getOwnPublicKey()
			expect(publicKey).toBeDefined()
		})

		it('should return the same public key on subsequent calls', async () => {
			const firstPublicKey = await keyManager.getOwnPublicKey()
			const secondPublicKey = await keyManager.getOwnPublicKey()

			expect(firstPublicKey).toBe(secondPublicKey)
		})

		it('should not return the same public key after resetting the own key pair', async () => {
			const firstPublicKey = await keyManager.getOwnPublicKey()
			await keyManager.clear()
			const secondPublicKey = await keyManager.getOwnPublicKey()

			expect(firstPublicKey).not.toBe(secondPublicKey)
		})

		it('should load the same public key from keyStorage with new instance', async () => {
			const firstPublicKey = await keyManager.getOwnPublicKey()

			const anotherKeyStorage = new KeyManager()
			const secondPublicKey = await anotherKeyStorage.getOwnPublicKey()

			expect(firstPublicKey).toStrictEqual(secondPublicKey)
		})
	})

	describe('getSharedSecret', () => {
		it('should return null if the shared secret is not yet derived', async () => {
			const sharedSecret = await keyManager.getSharedSecret()
			expect(sharedSecret).toBeNull()
		})

		it('should return the shared secret after setting the peer public key', async () => {
			const peerKeyPair = await generateKeyPair()
			await keyManager.setPeerPublicKey(peerKeyPair.publicKey)

			const sharedSecret = await keyManager.getSharedSecret()

			expect(sharedSecret).toBeDefined()
		})

		it('should load the same keys from keyStorage', async () => {
			const peerKeyPair = await generateKeyPair()
			await keyManager.setPeerPublicKey(peerKeyPair.publicKey)

			const sharedSecret = await keyManager.getSharedSecret()

			const anotherKeyStorage = new KeyManager()
			const sharedSecretFromAnotherStorage = await anotherKeyStorage.getSharedSecret()

			expect(sharedSecret).toStrictEqual(sharedSecretFromAnotherStorage)
		})
	})

	describe('setPeerPublicKey', () => {
		it('should derive different shared secret after resetting the peer public key', async () => {
			const peerKeyPair = await generateKeyPair()
			await keyManager.setPeerPublicKey(peerKeyPair.publicKey)
			const sharedSecret = await keyManager.getSharedSecret()

			const newPeerKeyPair = await generateKeyPair()
			await keyManager.setPeerPublicKey(newPeerKeyPair.publicKey)
			const newSharedSecret = await keyManager.getSharedSecret()

			expect(sharedSecret).not.toBe(newSharedSecret)
		})
	})

	describe('clear', () => {
		it('should reset the keys', async () => {
			const ownPublicKey = await keyManager.getOwnPublicKey()

			await keyManager.clear()

			const newOwnPublicKey = await keyManager.getOwnPublicKey()
			const sharedSecret = await keyManager.getSharedSecret()

			expect(ownPublicKey).not.toBe(newOwnPublicKey)
			expect(sharedSecret).toBeNull()
		})
	})
})
