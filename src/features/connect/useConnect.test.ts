import { AccountId } from '@/lib/accounts'
import { ImportedAccount } from '@/stores/account/account'
import { CHAIN_ID } from '@/stores/blockchain/chains'
import { useConnect } from './useConnect'
import { createPinia, setActivePinia } from 'pinia'

// Mock Vue composition functions
vi.mock('vue', async importOriginal => {
	const actual = await importOriginal<typeof import('vue')>()
	return {
		...actual,
		ref: vi.fn(value => ({ value })),
		computed: vi.fn(fn => ({ value: fn() })),
	}
})

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
	SUPPORTED_CHAIN_IDS: ['1', '11155111', '8453'], // Mock supported chain IDs for testing
}))

// Mock the specific blockchain store path used in common.ts
vi.mock('@/stores/blockchain/useBlockchain', () => ({
	useBlockchain: vi.fn(() => ({
		selectedChainId: mockSelectedChainId,
	})),
}))

vi.mock('@/stores/blockchain/chains', () => ({
	isSupportedChainId: vi.fn((chainId: string) => ['1', '11155111', '8453'].includes(chainId)),
}))

// Mock account store - THIS IS THE KEY MOCK FOR AUTH TESTING
const mockSelectedAccount = { value: null as null | ImportedAccount }
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

const testAddress = '0x1234567890123456789012345678901234567890'
const fakeAddress = '0x1234567890123456789012345678901234567891'

describe('useConnect', () => {
	let walletRequestHandler: ReturnType<typeof useConnect>['walletRequestHandler']

	beforeEach(() => {
		// Setup Pinia for each test
		const pinia = createPinia()
		setActivePinia(pinia)

		vi.clearAllMocks()
		mockSelectedAccount.value = {
			accountId: AccountId['biconomy.nexus.1.2.0'],
			category: 'Smart Account',
			address: testAddress,
			chainId: '1' as CHAIN_ID,
			vMethods: [],
		}

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
			describe('authorization validation', () => {
				it('should throw unauthorized error when no account is selected and address is provided', async () => {
					mockSelectedAccount.value = null
					await expect(
						walletRequestHandler('wallet_getCapabilities', [testAddress, ['0x1']]),
					).rejects.toThrow('No account selected')
				})

				it('should throw unauthorized error when address does not match selected account', async () => {
					await expect(
						walletRequestHandler('wallet_getCapabilities', [fakeAddress, ['0x1']]),
					).rejects.toThrow('Account address mismatch')
				})

				it('should throw error when no address is provided', async () => {
					await expect(walletRequestHandler('wallet_getCapabilities', [undefined, ['0x1']])).rejects.toThrow(
						'Invalid account address',
					)
				})
			})

			describe('chainIds validation', () => {
				it('should throw error when chainIds is not an array', async () => {
					await expect(
						walletRequestHandler('wallet_getCapabilities', [testAddress, 'invalid']),
					).rejects.toThrow('Invalid chainIds')
				})

				it('should throw error when chainIds is an empty array', async () => {
					await expect(walletRequestHandler('wallet_getCapabilities', [testAddress, []])).rejects.toThrow(
						'Invalid chainIds',
					)
				})

				it('should throw error when chainId does not have 0x prefix', async () => {
					await expect(walletRequestHandler('wallet_getCapabilities', [testAddress, ['1']])).rejects.toThrow(
						'chainId must have 0x prefix',
					)
				})

				it('should throw error when chainId has leading zeros', async () => {
					await expect(
						walletRequestHandler('wallet_getCapabilities', [testAddress, ['0x01']]),
					).rejects.toThrow('chainId must not have leading zeros')
				})

				it('should throw error when chainId is unsupported', async () => {
					await expect(
						walletRequestHandler('wallet_getCapabilities', [testAddress, ['0x999']]),
					).rejects.toThrow('Unsupported chain')
				})
			})

			describe('successful capability responses', () => {
				it('should return capabilities for single supported chainId', async () => {
					const result = await walletRequestHandler('wallet_getCapabilities', [testAddress, ['0x1']])
					expect(result).toEqual({
						'0x1': { atomic: { supported: true }, paymasterService: { supported: true } },
					})
				})

				it('should return capabilities for multiple supported chainIds', async () => {
					const result = await walletRequestHandler('wallet_getCapabilities', [
						testAddress,
						['0x1', '0x2105'],
					])
					expect(result).toEqual({
						'0x1': { atomic: { supported: true }, paymasterService: { supported: true } },
						'0x2105': { atomic: { supported: true }, paymasterService: { supported: true } },
					})
				})

				it('should return capabilities for all supported chains when no chainIds provided', async () => {
					const result = await walletRequestHandler('wallet_getCapabilities', [testAddress])
					expect(result).toEqual({
						'0x1': { atomic: { supported: true }, paymasterService: { supported: true } },
						'0xaa36a7': { atomic: { supported: true }, paymasterService: { supported: true } },
						'0x2105': { atomic: { supported: true }, paymasterService: { supported: true } },
					})
				})

				it('should return capabilities for all supported chains when chainIds is undefined', async () => {
					const result = await walletRequestHandler('wallet_getCapabilities', [testAddress, undefined])
					expect(result).toEqual({
						'0x1': { atomic: { supported: true }, paymasterService: { supported: true } },
						'0xaa36a7': { atomic: { supported: true }, paymasterService: { supported: true } },
						'0x2105': { atomic: { supported: true }, paymasterService: { supported: true } },
					})
				})
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
				const paramsWithDifferentFrom = [
					{
						...validSendCallsParams[0],
						from: fakeAddress,
					},
				]

				await expect(walletRequestHandler('wallet_sendCalls', paramsWithDifferentFrom)).rejects.toThrow(
					'Account address mismatch',
				)
			})

			it('should pass validation when account is selected and from matches', async () => {
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
