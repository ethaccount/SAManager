import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { useSigner } from '@/stores/useSigner'
import {
	concat,
	Contract,
	formatUnits,
	getBigInt,
	getBytes,
	Interface,
	isError,
	parseUnits,
	toBeHex,
	TypedDataEncoder,
	zeroPadValue,
} from 'ethers'
import {
	ADDRESS,
	ENTRY_POINT_V07_ADDRESS,
	ENTRY_POINT_V08_ADDRESS,
	getPermitTypedData,
	IERC20__factory,
	KernelAPI,
	PublicPaymaster,
} from 'sendop'
import { AccountRegistry } from '../accounts/registry'
import { isEthersError } from '../error'
import { getTokenAddress } from '../tokens'
import { SUPPORTED_PAYMASTERS, USDC_PAYMASTER_V07_ADDRESSES, USDC_PAYMASTER_V08_ADDRESSES } from './constants'

// Common paymaster data interface
export interface PaymasterData {
	paymaster: string
	paymasterData: string
	paymasterPostOpGasLimit: bigint
}

export function usePaymaster() {
	const selectedPaymaster = ref<keyof typeof SUPPORTED_PAYMASTERS>('public')

	const { selectedChainId, selectedEntryPointAddress } = useBlockchain()

	const paymasters = computed(() => {
		const excludedPaymasters: (keyof typeof SUPPORTED_PAYMASTERS)[] = []

		// exclude USDC paymaster if not supported
		if (!isUsdcPaymasterSupported.value) {
			excludedPaymasters.push('usdc')
		}

		return Object.values(SUPPORTED_PAYMASTERS).filter(paymaster => !excludedPaymasters.includes(paymaster.id))
	})

	// ============================ USDC Paymaster Start ============================

	const isUsdcPaymasterSupported = computed(() => {
		// Check if USDC token is available on the current chain
		if (!getTokenAddress(selectedChainId.value, 'USDC')) {
			return false
		}

		// Check entry point version and supported chains
		if (selectedEntryPointAddress.value === ENTRY_POINT_V07_ADDRESS) {
			// v0.7 only supports Base and Arbitrum (and their testnets)
			return selectedChainId.value in USDC_PAYMASTER_V07_ADDRESSES
		} else if (selectedEntryPointAddress.value === ENTRY_POINT_V08_ADDRESS) {
			// v0.8 supports all 5 chains and their testnets
			return selectedChainId.value in USDC_PAYMASTER_V08_ADDRESSES
		}

		return false
	})

	const usdcPaymasterAddress = computed(() => {
		if (!isUsdcPaymasterSupported.value) {
			return null
		}

		if (selectedEntryPointAddress.value === ENTRY_POINT_V07_ADDRESS) {
			return USDC_PAYMASTER_V07_ADDRESSES[selectedChainId.value as keyof typeof USDC_PAYMASTER_V07_ADDRESSES]
		} else if (selectedEntryPointAddress.value === ENTRY_POINT_V08_ADDRESS) {
			return USDC_PAYMASTER_V08_ADDRESSES[selectedChainId.value as keyof typeof USDC_PAYMASTER_V08_ADDRESSES]
		}

		return null
	})

	// USDC paymaster check results
	const usdcBalance = ref<bigint | null>(null)
	const usdcAllowance = ref<bigint | null>(null)
	const minAllowanceThreshold = ref<bigint>(BigInt('1000000')) // 1 USDC (6 decimals)
	const isCheckingUsdcData = ref(false)

	// USDC paymaster data state (for prepared paymaster)
	const usdcPaymasterData = ref<PaymasterData | null>(null)

	// Computed properties for formatting
	const formattedUsdcBalance = computed(() => {
		if (usdcBalance.value === null) return null
		return formatUnits(usdcBalance.value, 6) // USDC has 6 decimals
	})

	const formattedUsdcAllowance = computed(() => {
		if (usdcAllowance.value === null) return null
		return formatUnits(usdcAllowance.value, 6) // USDC has 6 decimals
	})

	const hasValidUsdcBalance = computed(() => {
		return usdcBalance.value !== null && usdcBalance.value > 0n
	})

	const hasValidUsdcAllowance = computed(() => {
		return usdcAllowance.value !== null && usdcAllowance.value > 0n
	})

	const showUsdcChecks = computed(() => {
		return selectedPaymaster.value === 'usdc'
	})

	async function checkUsdcBalanceAndAllowance() {
		console.log('checkUsdcBalanceAndAllowance')
		try {
			const { selectedAccount } = useAccount()
			const { selectedChainId, client } = useBlockchain()

			if (!selectedAccount.value || !client.value || !usdcPaymasterAddress.value) {
				throw new Error('Selected account, client, or usdc paymaster address is not set')
			}

			const usdcAddress = getTokenAddress(selectedChainId.value, 'USDC')
			if (!usdcAddress) {
				throw new Error('USDC token address is not set')
			}

			isCheckingUsdcData.value = true

			const usdc = IERC20__factory.connect(usdcAddress, client.value)

			// Check balance
			const balance = await usdc.balanceOf(selectedAccount.value.address)
			usdcBalance.value = balance

			// Check allowance
			const allowance = await usdc.allowance(selectedAccount.value.address, usdcPaymasterAddress.value)
			usdcAllowance.value = allowance

			// If allowance is sufficient, prepare paymaster data automatically
			if (allowance > 0n) {
				// Get paymaster post op gas limit
				const usdcPaymaster = new Contract(
					usdcPaymasterAddress.value,
					new Interface(['function additionalGasCharge() view returns (uint256)']),
					client.value,
				)
				const paymasterPostOpGasLimit = (await usdcPaymaster['additionalGasCharge()']()) as bigint

				// Store the prepared paymaster data
				usdcPaymasterData.value = {
					paymaster: usdcPaymasterAddress.value,
					paymasterData: concat(['0x00', usdcAddress, zeroPadValue('0x', 32)]),
					paymasterPostOpGasLimit,
				}
			} else {
				// Clear paymaster data if allowance is insufficient
				usdcPaymasterData.value = null
			}
		} catch (error) {
			console.error('Error checking USDC balance and allowance:', error)
			usdcBalance.value = null
			usdcAllowance.value = null
			usdcPaymasterData.value = null
		} finally {
			isCheckingUsdcData.value = false
		}
	}

	function resetUsdcData() {
		usdcBalance.value = null
		usdcAllowance.value = null
		isCheckingUsdcData.value = false
		usdcPaymasterData.value = null
	}

	// USDC Permit functionality
	const permitAllowanceAmount = ref<string>(formatUnits(1_000_000n, 6))
	const isSigningPermit = ref(false)

	// Validate permit allowance amount
	const isValidPermitAmount = computed(() => {
		try {
			return parseUnits(permitAllowanceAmount.value, 6) > 0n
		} catch {
			return false
		}
	})

	async function handleSignPermit() {
		try {
			isSigningPermit.value = true

			const { selectedAccount } = useAccount()
			const { selectedChainId, client } = useBlockchain()
			const { selectedSigner } = useSigner()

			if (!selectedAccount.value || !client.value || !selectedSigner.value) {
				throw new Error('Selected account, client, or signer is not set')
			}

			if (!usdcPaymasterAddress.value) {
				throw new Error('USDC paymaster address is not available')
			}

			const usdcAddress = getTokenAddress(selectedChainId.value, 'USDC')
			if (!usdcAddress) {
				throw new Error('USDC token address is not set')
			}

			// Check if account is Kernel (only supported for now)
			const accountName = AccountRegistry.getName(selectedAccount.value.accountId)
			if (accountName !== 'Kernel') {
				throw new Error('USDC permit signature is currently only supported for Kernel')
			}

			const accountVersion = AccountRegistry.getVersion(selectedAccount.value.accountId)

			// Convert permit amount to BigInt
			const permitAmount = parseUnits(permitAllowanceAmount.value, 6)

			// Generate typed data for permit
			const typedData = await getPermitTypedData({
				client: client.value,
				tokenAddress: usdcAddress,
				chainId: getBigInt(selectedChainId.value),
				ownerAddress: selectedAccount.value.address,
				spenderAddress: usdcPaymasterAddress.value,
				amount: permitAmount,
			})

			// Sign using Kernel 1271
			let permitSig: string
			try {
				permitSig = await KernelAPI.sign1271({
					version: accountVersion as '0.3.1' | '0.3.3',
					validator: ADDRESS.ECDSAValidator,
					hash: getBytes(TypedDataEncoder.hash(...typedData)),
					chainId: selectedChainId.value,
					accountAddress: selectedAccount.value.address,
					signHash: async (hash: Uint8Array) => {
						if (!selectedSigner.value) {
							throw new Error('No signer selected')
						}
						return selectedSigner.value.signHash(hash)
					},
				})
			} catch (error) {
				// Handle user rejected error
				if (error instanceof Error) {
					if (isEthersError(error)) {
						if (isError(error, 'ACTION_REJECTED')) {
							return
						}
					}
					if (error.message.includes('The operation either timed out or was not allowed')) {
						return
					}
				}
				throw error
			}

			// Get paymaster post op gas limit
			const usdcPaymaster = new Contract(
				usdcPaymasterAddress.value,
				new Interface(['function additionalGasCharge() view returns (uint256)']),
				client.value,
			)
			const paymasterPostOpGasLimit = (await usdcPaymaster['additionalGasCharge()']()) as bigint

			// Prepare paymaster data
			const paymasterData = concat(['0x00', usdcAddress, zeroPadValue(toBeHex(permitAmount), 32), permitSig])

			// Store the prepared paymaster data
			usdcPaymasterData.value = {
				paymaster: usdcPaymasterAddress.value,
				paymasterData,
				paymasterPostOpGasLimit,
			}
		} catch (error) {
			console.error('Error signing USDC permit:', error)
			throw new Error(`Failed to sign USDC permit: ${error instanceof Error ? error.message : 'Unknown error'}`)
		} finally {
			isSigningPermit.value = false
		}
	}

	// ============================ USDC Paymaster End ============================

	/**
	 * Builds paymaster data based on the selected paymaster type
	 * @returns PaymasterData object or null if no paymaster is selected or data is not ready
	 */
	async function buildPaymasterData(): Promise<PaymasterData | null> {
		if (selectedPaymaster.value === 'public') {
			return {
				paymaster: await PublicPaymaster.getPaymaster(),
				paymasterData: await PublicPaymaster.getPaymasterData(),
				paymasterPostOpGasLimit: await PublicPaymaster.getPaymasterPostOpGasLimit(),
			}
		} else if (selectedPaymaster.value === 'usdc') {
			if (!usdcPaymasterData.value) {
				throw new Error('USDC paymaster data not prepared. Please sign the permit signature first.')
			}
			return usdcPaymasterData.value
		}

		return null
	}

	return {
		paymasters,
		selectedPaymaster,

		// ============================ USDC Paymaster Start ============================
		usdcBalance,
		usdcAllowance,
		minAllowanceThreshold,
		isCheckingUsdcData,
		usdcPaymasterData,

		// computed
		usdcPaymasterAddress,
		formattedUsdcBalance,
		formattedUsdcAllowance,
		hasValidUsdcBalance,
		hasValidUsdcAllowance,
		showUsdcChecks,

		checkUsdcBalanceAndAllowance,
		resetUsdcData,

		// USDC Permit functionality
		permitAllowanceAmount,
		isValidPermitAmount,
		isSigningPermit,
		handleSignPermit,
		// ============================ USDC Paymaster End ============================

		// ============================ Build Paymaster Data ============================
		buildPaymasterData,
		// ============================ Build Paymaster Data End ============================
	}
}
