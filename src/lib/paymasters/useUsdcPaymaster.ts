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
	parseUnits,
	toBeHex,
	TypedDataEncoder,
	zeroPadValue,
} from 'ethers'
import {
	ADDRESS,
	ENTRY_POINT_V07_ADDRESS,
	ENTRY_POINT_V08_ADDRESS,
	ERC1271_MAGICVALUE,
	getPermitTypedData,
	IERC1271__factory,
	IERC20__factory,
	isSameAddress,
	TypedData,
} from 'sendop'
import { sign1271 } from '../accounts/account-specific'
import { AccountRegistry } from '../accounts/registry'
import { getChainMismatchErrorMessage, isChainMismatchError, isUserRejectedError } from '../error'
import { getTokenAddress } from '../tokens'
import { USDC_PAYMASTER_V07_ADDRESSES, USDC_PAYMASTER_V08_ADDRESSES } from './constants'
import { PaymasterData } from './types'

const DEFAULT_PERMIT_ALLOWANCE_AMOUNT = formatUnits(1_000_000n, 6)

export function useUsdcPaymaster() {
	const { selectedChainId, currentEntryPointAddress } = useBlockchain()

	// state
	const usdcBalance = ref<bigint | null>(null)
	const usdcAllowance = ref<bigint | null>(null)
	const usdcPaymasterData = ref<PaymasterData | null>(null)
	const isCheckingUsdcData = ref(false)
	const permitAllowanceAmount = ref<string>(DEFAULT_PERMIT_ALLOWANCE_AMOUNT)
	const isSigningPermit = ref(false)

	function resetUsdcData() {
		usdcBalance.value = null
		usdcAllowance.value = null
		isCheckingUsdcData.value = false
		usdcPaymasterData.value = null
		permitAllowanceAmount.value = DEFAULT_PERMIT_ALLOWANCE_AMOUNT
		isSigningPermit.value = false
	}

	// Validate permit allowance amount
	const isValidPermitAmount = computed(() => {
		try {
			return parseUnits(permitAllowanceAmount.value, 6) > 0n
		} catch {
			return false
		}
	})

	const isUsdcPaymasterSupported = computed(() => {
		// Check if USDC token is available on the current chain
		if (!getTokenAddress(selectedChainId.value, 'USDC')) {
			return false
		}

		// Check entry point version and supported chains
		if (isSameAddress(currentEntryPointAddress.value, ENTRY_POINT_V07_ADDRESS)) {
			// v0.7 only supports Base and Arbitrum (and their testnets)
			return selectedChainId.value in USDC_PAYMASTER_V07_ADDRESSES
		} else if (isSameAddress(currentEntryPointAddress.value, ENTRY_POINT_V08_ADDRESS)) {
			// v0.8 supports all 5 chains and their testnets
			return selectedChainId.value in USDC_PAYMASTER_V08_ADDRESSES
		}

		return false
	})

	const usdcPaymasterAddress = computed(() => {
		if (!isUsdcPaymasterSupported.value) {
			return null
		}

		if (isSameAddress(currentEntryPointAddress.value, ENTRY_POINT_V07_ADDRESS)) {
			return USDC_PAYMASTER_V07_ADDRESSES[selectedChainId.value as keyof typeof USDC_PAYMASTER_V07_ADDRESSES]
		} else if (isSameAddress(currentEntryPointAddress.value, ENTRY_POINT_V08_ADDRESS)) {
			return USDC_PAYMASTER_V08_ADDRESSES[selectedChainId.value as keyof typeof USDC_PAYMASTER_V08_ADDRESSES]
		}

		return null
	})

	const formattedUsdcBalance = computed(() => {
		if (usdcBalance.value === null) return null
		return formatUnits(usdcBalance.value, 6) // USDC has 6 decimals
	})

	const formattedUsdcAllowance = computed(() => {
		if (usdcAllowance.value === null) return null
		return formatUnits(usdcAllowance.value, 6) // USDC has 6 decimals
	})

	const usdcAddress = computed(() => {
		return getTokenAddress(selectedChainId.value, 'USDC')
	})

	async function checkUsdcBalanceAndAllowance() {
		resetUsdcData()

		try {
			const { selectedAccount } = useAccount()
			const { selectedChainId, client } = useBlockchain()

			if (!selectedAccount.value) {
				throw new Error('[checkUsdcBalanceAndAllowance] Selected account is not set')
			}

			if (!usdcPaymasterAddress.value) {
				throw new Error('[checkUsdcBalanceAndAllowance] USDC paymaster address is not set')
			}

			const usdcAddress = getTokenAddress(selectedChainId.value, 'USDC')
			if (!usdcAddress) {
				throw new Error('[checkUsdcBalanceAndAllowance] USDC token address is not set')
			}

			isCheckingUsdcData.value = true

			const usdc = IERC20__factory.connect(usdcAddress, client.value)

			// Check balance
			const balance = await usdc.balanceOf(selectedAccount.value.address)
			usdcBalance.value = balance

			// Check allowance
			const allowance = await usdc.allowance(selectedAccount.value.address, usdcPaymasterAddress.value)
			usdcAllowance.value = allowance

			// If allowance is sufficient, automatically prepare paymaster data without permit signature
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
			usdcBalance.value = null
			usdcAllowance.value = null
			usdcPaymasterData.value = null
			throw error
		} finally {
			isCheckingUsdcData.value = false
		}
	}

	// Check if usdcPaymasterData has a permit signature
	const hasUsdcPermitSignature = computed(() => {
		if (!usdcPaymasterData.value?.paymasterData) return false

		// paymasterData structure: concat(['0x00', usdcAddress, zeroPadValue(permitAmount, 32), permitSig])
		// When no permit signature: concat(['0x00', usdcAddress, zeroPadValue('0x', 32)])
		// The basic structure without permit is: 0x00 (1 byte) + usdcAddress (20 bytes) + zeroPadValue('0x', 32) (32 bytes) = 53 bytes = 106 hex chars + 2 for '0x' = 108 chars
		// With permit signature, it should be longer
		const paymasterData = usdcPaymasterData.value.paymasterData
		const dataLength = paymasterData.length
		const basicStructureLength = 2 + 2 + 40 + 64 // '0x' + '00' + usdcAddress + zeroPadded32Bytes

		if (dataLength <= basicStructureLength) return false

		// Check if the additional data is not just zeros (which would indicate no real permit signature)
		const permitSignaturePart = paymasterData.slice(basicStructureLength)
		return permitSignaturePart !== '0'.repeat(permitSignaturePart.length)
	})

	async function handleSignUsdcPermit(isDeployed: boolean) {
		try {
			isSigningPermit.value = true

			const { selectedAccount, accountVMethods } = useAccount()
			const { selectedChainId, client } = useBlockchain()
			const { selectedSigner } = useSigner()

			if (!selectedAccount.value) {
				throw new Error('[handleSignUsdcPermit] Selected account is not set')
			}

			if (!selectedSigner.value) {
				throw new Error('[handleSignUsdcPermit] Selected signer is not set')
			}

			const signer = selectedSigner.value

			if (!usdcPaymasterAddress.value) {
				throw new Error('[handleSignUsdcPermit] USDC paymaster address is not available')
			}

			const usdcAddress = getTokenAddress(selectedChainId.value, 'USDC')
			if (!usdcAddress) {
				throw new Error('[handleSignUsdcPermit] USDC token address is not set')
			}

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

			const currentVMethod = accountVMethods.value.find(vMethod => {
				if (vMethod.signerType === selectedSigner.value?.type) {
					return true
				}
				return false
			})

			const validatorAddress = currentVMethod?.validatorAddress
			const isModularAccount = AccountRegistry.getIsModular(selectedAccount.value.accountId)

			if (isModularAccount && !validatorAddress) {
				throw new Error('[handleSignUsdcPermit] No validator address found for the validation method')
			}

			let permitSig: string
			try {
				permitSig = await sign1271({
					accountId: selectedAccount.value.accountId,
					typedData,
					hash: getBytes(TypedDataEncoder.hash(...typedData)),
					validatorAddress,
					chainId: selectedChainId.value,
					accountAddress: selectedAccount.value.address,
					signTypedData: async (typedData: TypedData) => {
						// OwnableValidator uses a special signature verification method
						// It recovers signatures using ECDSA.toEthSignedMessageHash(hash), forcing EIP-191 format
						// Therefore, we cannot use standard signTypedData and must use signHash to directly sign the hash
						if (validatorAddress && isSameAddress(validatorAddress, ADDRESS.OwnableValidator)) {
							return signer.signHash(getBytes(TypedDataEncoder.hash(...typedData)))
						}
						return signer.signTypedData(typedData)
					},
				})

				// check if the permit sig is valid only if the account is deployed
				if (isDeployed) {
					const contract = IERC1271__factory.connect(selectedAccount.value.address, client.value)
					try {
						const result = await contract.isValidSignature(TypedDataEncoder.hash(...typedData), permitSig)
						if (result !== ERC1271_MAGICVALUE) {
							throw new Error(`Invalid permit signature`)
						}
					} catch (error) {
						throw error
					}
				}
			} catch (error) {
				// User rejected signing on browser wallet or passkey. Don't show error message
				if (isUserRejectedError(error)) return

				if (error instanceof Error && error.message.includes('could not decode result data')) {
					throw new Error('Invalid permit signature: Account may not be deployed')
				}

				// Chain mismatch error - show user-friendly message
				if (isChainMismatchError(error)) {
					throw new Error(getChainMismatchErrorMessage(error))
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
			throw error
		} finally {
			isSigningPermit.value = false
		}
	}

	return {
		usdcBalance,
		usdcAllowance,
		isCheckingUsdcData,
		usdcPaymasterData,
		permitAllowanceAmount,
		isSigningPermit,

		// computed
		isValidPermitAmount,
		isUsdcPaymasterSupported,
		usdcPaymasterAddress,
		formattedUsdcBalance,
		formattedUsdcAllowance,
		usdcAddress,
		hasUsdcPermitSignature,

		checkUsdcBalanceAndAllowance,
		resetUsdcData,
		handleSignUsdcPermit,
	}
}
