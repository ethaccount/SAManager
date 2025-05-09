import AccountOptions from '@/components/ImportAccountModal/AccountOptions.vue'
import ConfirmImport from '@/components/ImportAccountModal/ConfirmImport.vue'
import ImportAccountModal from '@/components/ImportAccountModal/ImportAccountModal.vue'
import ImportOptions from '@/components/ImportAccountModal/ImportOptions.vue'
import ValidateSmartEOA from '@/components/ImportAccountModal/ValidateSmartEOA.vue'
import ConnectEOAWallet from '@/components/signer/ConnectEOAWallet.vue'
import ConnectPasskey from '@/components/signer/ConnectPasskey.vue'
import { AccountCategory, AccountId } from '@/stores/account/account'
import {
	createEOAOwnedValidation,
	createPasskeyValidation,
	createSmartEOAValidation,
	ValidationIdentifier,
} from '@/stores/validation/validation'
import { defineStore, storeToRefs } from 'pinia'
import { useModal } from 'vue-final-modal'
import { usePasskey } from './passkey/usePasskey'

// IAM: Import Account Modal

export enum IAMStageKey {
	INITIAL = 'INITIAL',

	CONNECT_PASSKEY = 'CONNECT_PASSKEY',
	PASSKEY_ACCOUNT_OPTIONS = 'PASSKEY_ACCOUNT_OPTIONS',
	CONFIRM_IMPORT_BY_PASSKEY = 'CONFIRM_IMPORT_BY_PASSKEY',

	CONNECT_EOA_WALLET = 'CONNECT_EOA_WALLET',
	EOA_ACCOUNT_OPTIONS = 'EOA_ACCOUNT_OPTIONS',
	CONFIRM_IMPORT_BY_EOA = 'CONFIRM_IMPORT_BY_EOA',

	CONNECT_SMART_EOA = 'CONNECT_SMART_EOA',
	VALIDATE_SMART_EOA = 'VALIDATE_SMART_EOA',
	CONFIRM_IMPORT_BY_SMART_EOA = 'CONFIRM_IMPORT_BY_SMART_EOA',

	// ADDRESS_INPUT,
	// ADDRESS_VALIDATION,
	// CONFIRM_IMPORT_BY_ADDRESS,
}

/*

passkey -> connect passkey -> passkey account options -> confirm import
eoa -> connect eoa -> eoa account options -> confirm import
smart eoa -> connect eoa -> validate smart eoa -> confirm import
address -> input address -> address validation -> connect eoa or passkey -> confirm import

*/

type IAMFormData = {
	address?: string
	accountId?: AccountId
	vOptions?: ValidationIdentifier[]
	category?: AccountCategory
}

type ComponentProps<T> = T extends new () => { $props: infer P } ? P : never

export type IAMStage<T extends Component = Component> = {
	component: T
	next: IAMStageKey[]
	title?: string
	attrs?: ComponentProps<T>
	requiredFields?: (keyof IAMFormData)[] // required formData fields from previous stage
}

const IAM_CONFIG: Record<IAMStageKey, IAMStage<Component>> = {
	[IAMStageKey.INITIAL]: {
		component: ImportOptions,
		next: [IAMStageKey.CONNECT_PASSKEY, IAMStageKey.CONNECT_EOA_WALLET, IAMStageKey.CONNECT_SMART_EOA],
		title: 'Import Account',
	} satisfies IAMStage<typeof ImportOptions>,

	// ========================================== Passkey ==========================================

	[IAMStageKey.CONNECT_PASSKEY]: {
		component: ConnectPasskey,
		next: [IAMStageKey.PASSKEY_ACCOUNT_OPTIONS],
		title: 'Connect Passkey',
		attrs: {
			onConfirm: () => {
				const { credential } = usePasskey()
				if (!credential.value) throw new Error('IAMStageKey.CONNECT_PASSKEY: No passkey credential found')
				useImportAccountModal().updateFormData({
					category: 'Smart Account',
					vOptions: [createPasskeyValidation(credential.value)],
				})
				useImportAccountModal().goNextStage(IAMStageKey.PASSKEY_ACCOUNT_OPTIONS)
			},
		},
		requiredFields: ['category'],
	} satisfies IAMStage<typeof ConnectPasskey>,

	[IAMStageKey.PASSKEY_ACCOUNT_OPTIONS]: {
		component: AccountOptions,
		next: [IAMStageKey.CONFIRM_IMPORT_BY_PASSKEY],
		title: 'Select an Account',
		attrs: {
			vOption: () => {
				const vOption = useImportAccountModalStore().formData.vOptions?.find(v => v.type === 'Passkey')
				if (!vOption) throw new Error('PASSKEY_ACCOUNT_OPTIONS: No passkey authenticatorIdHash found')
				return vOption
			},
			onAccountSelected: (account: { address: string; accountId: AccountId }) => {
				useImportAccountModal().updateFormData({
					address: account.address,
					accountId: account.accountId,
				})
				useImportAccountModal().goNextStage(IAMStageKey.CONFIRM_IMPORT_BY_PASSKEY)
			},
		},
		requiredFields: ['vOptions'],
	} satisfies IAMStage<typeof AccountOptions>,

	[IAMStageKey.CONFIRM_IMPORT_BY_PASSKEY]: {
		component: ConfirmImport,
		next: [],
		title: 'Confirm Import',
		attrs: {
			accountData: () => {
				const { address, accountId, vOptions, category } = useImportAccountModalStore().formData
				if (!address) throw new Error('CONFIRM_IMPORT_BY_PASSKEY: No address')
				if (!accountId) throw new Error('CONFIRM_IMPORT_BY_PASSKEY: No accountId')
				if (!vOptions) throw new Error('CONFIRM_IMPORT_BY_PASSKEY: No vOptions')
				if (!category) throw new Error('CONFIRM_IMPORT_BY_PASSKEY: No category')

				return {
					address,
					accountId,
					vOptions,
					category,
				}
			},
		},
		requiredFields: ['accountId', 'address'],
	} satisfies IAMStage<typeof ConfirmImport>,

	// ========================================== EOA-Owned ==========================================

	[IAMStageKey.CONNECT_EOA_WALLET]: {
		component: ConnectEOAWallet,
		next: [IAMStageKey.EOA_ACCOUNT_OPTIONS],
		title: 'Connect EOA Wallet',
		attrs: {
			onConfirm: (address: string) => {
				useImportAccountModal().updateFormData({
					category: 'Smart Account',
					vOptions: [createEOAOwnedValidation(address)],
				})
				useImportAccountModal().goNextStage(IAMStageKey.EOA_ACCOUNT_OPTIONS)
			},
		},
		requiredFields: ['category'],
	} satisfies IAMStage<typeof ConnectEOAWallet>,

	[IAMStageKey.EOA_ACCOUNT_OPTIONS]: {
		component: AccountOptions,
		next: [IAMStageKey.CONFIRM_IMPORT_BY_EOA],
		title: 'Select an Account',
		attrs: {
			vOption: () => {
				const vOption = useImportAccountModalStore().formData.vOptions?.find(v => v.type === 'EOA-Owned')
				if (!vOption) throw new Error('EOA_ACCOUNT_OPTIONS: No EOA address found')
				return vOption
			},
			onAccountSelected: (account: { address: string; accountId: AccountId }) => {
				useImportAccountModal().updateFormData({
					address: account.address,
					accountId: account.accountId,
				})
				useImportAccountModal().goNextStage(IAMStageKey.CONFIRM_IMPORT_BY_EOA)
			},
		},
		requiredFields: ['vOptions'],
	} satisfies IAMStage<typeof AccountOptions>,

	[IAMStageKey.CONFIRM_IMPORT_BY_EOA]: {
		component: ConfirmImport,
		next: [],
		title: 'Confirm Import',
		attrs: {
			accountData: () => {
				const { address, accountId, vOptions, category } = useImportAccountModalStore().formData
				if (!address) throw new Error('CONFIRM_IMPORT_BY_EOA: No address')
				if (!accountId) throw new Error('CONFIRM_IMPORT_BY_EOA: No accountId')
				if (!vOptions) throw new Error('CONFIRM_IMPORT_BY_EOA: No vOptions')
				if (!category) throw new Error('CONFIRM_IMPORT_BY_EOA: No category')

				return {
					address,
					accountId,
					vOptions,
					category,
				}
			},
		},
		requiredFields: ['accountId', 'address'],
	} satisfies IAMStage<typeof ConfirmImport>,

	// ========================================== Smart EOA ==========================================

	[IAMStageKey.CONNECT_SMART_EOA]: {
		component: ConnectEOAWallet,
		next: [IAMStageKey.VALIDATE_SMART_EOA],
		title: 'Connect Smart EOA',
		attrs: {
			onConfirm: (address: string) => {
				useImportAccountModal().updateFormData({
					address,
					category: 'Smart EOA',
					vOptions: [createSmartEOAValidation(address)],
				})
				useImportAccountModal().goNextStage(IAMStageKey.VALIDATE_SMART_EOA)
			},
		},
		requiredFields: ['category'],
	} satisfies IAMStage<typeof ConnectEOAWallet>,
	[IAMStageKey.VALIDATE_SMART_EOA]: {
		component: ValidateSmartEOA,
		next: [IAMStageKey.CONFIRM_IMPORT_BY_SMART_EOA],
		title: 'Validate Smart EOA',
		attrs: {
			address: () => {
				const address = useImportAccountModalStore().formData.address
				if (!address) throw new Error('VALIDATE_SMART_EOA: No address')
				return address
			},
			onConfirm: (accountId: AccountId) => {
				useImportAccountModal().updateFormData({ accountId })
				useImportAccountModal().goNextStage(IAMStageKey.CONFIRM_IMPORT_BY_SMART_EOA)
			},
		},
		requiredFields: ['address'],
	} satisfies IAMStage<typeof ValidateSmartEOA>,

	[IAMStageKey.CONFIRM_IMPORT_BY_SMART_EOA]: {
		component: ConfirmImport,
		next: [],
		title: 'Confirm Import',
		attrs: {
			accountData: () => {
				const { address, accountId, vOptions, category } = useImportAccountModalStore().formData
				if (!address) throw new Error('CONFIRM_IMPORT_BY_SMART_EOA: No address')
				if (!accountId) throw new Error('CONFIRM_IMPORT_BY_SMART_EOA: No accountId')
				if (!vOptions) throw new Error('CONFIRM_IMPORT_BY_SMART_EOA: No vOptions')
				if (!category) throw new Error('CONFIRM_IMPORT_BY_SMART_EOA: No category')

				return {
					address,
					accountId,
					vOptions,
					category,
				}
			},
		},
		requiredFields: ['accountId'],
	} satisfies IAMStage<typeof ConfirmImport>,
}

export const useImportAccountModalStore = defineStore('useImportAccountModalStore', () => {
	const stageKey = ref<IAMStageKey>(IAMStageKey.INITIAL)
	const stageKeyHistory = ref<IAMStageKey[]>([])

	const formData = ref<IAMFormData>({})

	const stage = computed<IAMStage>(() => {
		return IAM_CONFIG[stageKey.value]
	})

	const reset = () => {
		stageKey.value = IAMStageKey.INITIAL
		stageKeyHistory.value = []
		formData.value = {}
	}

	const updateFormData = (data: Partial<IAMFormData>) => {
		formData.value = { ...formData.value, ...data }
	}

	const canGoBack = computed(() => {
		return stageKeyHistory.value.length > 0
	})

	const canGoNext = computed(() => {
		return (stage.value?.next.length ?? 0) > 0
	})

	const goNextStage = (nextStageKey: IAMStageKey) => {
		assertValidTransition(stageKey.value, nextStageKey)
		stageKeyHistory.value.push(stageKey.value)
		stageKey.value = nextStageKey
	}

	const goBackStage = () => {
		if (stageKeyHistory.value.length === 0) {
			throw new Error('No history found')
		}
		const previousState = stageKeyHistory.value.pop()
		if (previousState) {
			// Get current stage's required fields
			const currentStage = IAM_CONFIG[stageKey.value]
			const requiredFields = currentStage.requiredFields || []

			// Remove those fields from formData
			const newFormData = { ...formData.value }
			requiredFields.forEach(field => {
				delete newFormData[field as keyof IAMFormData]
			})

			// Update state
			formData.value = newFormData
			stageKey.value = previousState
		}
	}

	const { open, close } = useModal({
		component: ImportAccountModal,
		attrs: {
			onClose: () => close(),
		},
		slots: {},
	})

	return {
		openModal: open,
		closeModal: close,
		stageKey,
		stage,
		canGoBack,
		canGoNext,
		goNextStage,
		goBackStage,
		reset,
		formData,
		updateFormData,
	}
})

export function useImportAccountModal() {
	const store = useImportAccountModalStore()
	return {
		...store,
		...storeToRefs(store),
	}
}

const assertValidTransition = (fromStateKey: IAMStageKey, toStateKey: IAMStageKey) => {
	const fromStage = IAM_CONFIG[fromStateKey]
	const toStage = IAM_CONFIG[toStateKey]
	const store = useImportAccountModalStore()

	if (!fromStage?.next.includes(toStateKey)) {
		throw new Error(
			`Invalid transition from ${fromStateKey} to ${toStateKey}. Allowed transitions: ${fromStage?.next.join(
				', ',
			)}`,
		)
	}

	const requiredFields = toStage.requiredFields
	if (requiredFields) {
		const missingFields = requiredFields.filter(key => !store.formData[key as keyof IAMFormData])
		if (missingFields.length > 0) {
			throw new Error(`Missing required fields for ${toStateKey}: ${missingFields.join(', ')}`)
		}
	}
}
