import { useConnect } from './useConnect'

// Mock Vue composition functions
vi.mock('vue', () => ({
	ref: vi.fn(value => ({ value })),
	computed: vi.fn(fn => ({ value: fn() })),
}))

// Mock blockchain store
const mockClient = {
	send: vi.fn(),
}

const mockSelectedChainId = { value: '1' } // Mock for selectedChainId

vi.mock('@/stores/blockchain', () => ({
	useBlockchain: vi.fn(() => ({
		client: { value: mockClient },
		selectedChainId: mockSelectedChainId,
	})),
}))

// Mock the specific blockchain store path used in common.ts
vi.mock('@/stores/blockchain/useBlockchain', () => ({
	useBlockchain: vi.fn(() => ({
		selectedChainId: mockSelectedChainId,
	})),
}))

vi.mock('@/stores/blockchain/chains', () => ({
	isSupportedChainId: vi.fn(() => true),
}))

// Mock account store - THIS IS THE KEY MOCK FOR AUTH TESTING
const mockSelectedAccount = { value: null as null | { address: string } }
vi.mock('@/stores/account/useAccount', () => ({
	useAccount: vi.fn(() => ({
		selectedAccount: mockSelectedAccount,
	})),
}))

// Mock minimal other dependencies
vi.mock('@/features/connect/wallet_switchEthereumChain', () => ({
	handleWalletSwitchEthereumChain: vi.fn(),
}))

vi.mock('@/lib/error', () => ({
	getErrorMessage: vi.fn(err => err?.message || 'Unknown error'),
}))

describe('useConnect', () => {
	let walletRequestHandler: ReturnType<typeof useConnect>['walletRequestHandler']

	beforeEach(() => {
		vi.clearAllMocks()
		mockSelectedAccount.value = null
		mockSelectedChainId.value = '1' // Reset to chain ID 1
		walletRequestHandler = useConnect().walletRequestHandler
	})

	describe('walletRequestHandler', () => {
		describe('eth_chainId', () => {
			it('should return chainId when called with eth_chainId method', async () => {
				const mockChainId = '0x1'
				mockClient.send.mockResolvedValue(mockChainId)

				const result = await walletRequestHandler('eth_chainId', [])

				expect(result).toBe(mockChainId)
				expect(mockClient.send).toHaveBeenCalledWith('eth_chainId', [])
			})
		})

		// pnpm vitest --run test -t "wallet_getCapabilities"
		describe('wallet_getCapabilities', () => {
			it('should throw unauthorized error when no account is selected and address is provided', async () => {
				// Setup: no account selected
				mockSelectedAccount.value = null

				// Test with address parameter - should reject due to authorization check
				await expect(
					walletRequestHandler('wallet_getCapabilities', [
						'0x1234567890123456789012345678901234567890',
						['0x1'],
					]),
				).rejects.toThrow('No account selected')
			})

			it('should throw unauthorized error when address does not match selected account', async () => {
				// Setup: account selected but different address
				mockSelectedAccount.value = { address: '0x9876543210987654321098765432109876543210' }

				await expect(
					walletRequestHandler('wallet_getCapabilities', [
						'0x1234567890123456789012345678901234567890',
						['0x1'],
					]),
				).rejects.toThrow('Account address mismatch')
			})

			it('should not throw unauthorized error when account is selected and addresses match', async () => {
				// Setup: account selected with matching address
				const testAddress = '0x1234567890123456789012345678901234567890'
				mockSelectedAccount.value = { address: testAddress }

				const result = await walletRequestHandler('wallet_getCapabilities', [testAddress, ['0x1']])

				// Should return capabilities for the requested chain
				expect(result).toEqual({ '0x1': { atomic: { status: 'supported' } } })
			})

			it('should throw error when no address is provided', async () => {
				await expect(walletRequestHandler('wallet_getCapabilities', [undefined, ['0x1']])).rejects.toThrow(
					'Invalid account address',
				)
			})
		})

		// pnpm vitest --run test -t "wallet_sendCalls"
		describe('wallet_sendCalls', () => {
			const validSendCallsParams = [
				{
					version: '2.0',
					chainId: '0x1',
					atomicRequired: true,
					calls: [{ to: '0x1234567890123456789012345678901234567890', data: '0x' }],
				},
			]

			it('should throw unauthorized error when no account is selected', async () => {
				// Setup: no account selected
				mockSelectedAccount.value = null

				await expect(walletRequestHandler('wallet_sendCalls', validSendCallsParams)).rejects.toThrow(
					'No account selected',
				)
			})

			it('should throw unauthorized error when from address does not match selected account', async () => {
				// Setup: account selected but different from address
				mockSelectedAccount.value = { address: '0x9876543210987654321098765432109876543210' }
				const paramsWithDifferentFrom = [
					{
						...validSendCallsParams[0],
						from: '0x1234567890123456789012345678901234567890',
					},
				]

				await expect(walletRequestHandler('wallet_sendCalls', paramsWithDifferentFrom)).rejects.toThrow(
					'Account address mismatch',
				)
			})

			it('should pass validation when account is selected and from matches', async () => {
				// Setup: account selected with matching from address
				const testAddress = '0x1234567890123456789012345678901234567890'
				mockSelectedAccount.value = { address: testAddress }
				const paramsWithFrom = [
					{
						...validSendCallsParams[0],
						from: testAddress,
					},
				]

				// Test that validation passes (doesn't throw) within reasonable time
				// wallet_sendCalls won't resolve but should not reject immediately if validation passes
				let rejected = false
				let rejectionError: unknown = null

				try {
					await Promise.race([
						walletRequestHandler('wallet_sendCalls', paramsWithFrom).catch(err => {
							rejected = true
							rejectionError = err
							throw err
						}),
						new Promise(resolve => setTimeout(() => resolve('timeout'), 50)),
					])
				} catch (error) {
					if (error !== 'timeout') {
						rejected = true
						rejectionError = error
					}
				}

				// Should not have been rejected due to authorization error
				expect(rejected).toBe(false)
				expect(rejectionError as unknown).toBe(null)
			})

			it('should pass validation when account is selected and no from is provided', async () => {
				// Setup: account selected, no from address (should use selectedAccount.address)
				mockSelectedAccount.value = { address: '0x1234567890123456789012345678901234567890' }

				// Test that validation passes (doesn't throw) within reasonable time
				let rejected = false
				let rejectionError: unknown = null

				try {
					await Promise.race([
						walletRequestHandler('wallet_sendCalls', validSendCallsParams).catch(err => {
							rejected = true
							rejectionError = err
							throw err
						}),
						new Promise(resolve => setTimeout(() => resolve('timeout'), 50)),
					])
				} catch (error) {
					if (error !== 'timeout') {
						rejected = true
						rejectionError = error
					}
				}

				// Should not have been rejected due to authorization error
				expect(rejected).toBe(false)
				expect(rejectionError).toBe(null)
			})
		})
	})
})
