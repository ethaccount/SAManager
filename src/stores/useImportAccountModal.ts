import AccountOptions from '@/components/ImportAccountModal/AccountOptions.vue'
import ConfirmImport from '@/components/ImportAccountModal/ConfirmImport.vue'
import ImportAccountModal from '@/components/ImportAccountModal/ImportAccountModal.vue'
import ImportOptions from '@/components/ImportAccountModal/ImportOptions.vue'
import ValidateSmartEOA from '@/components/ImportAccountModal/ValidateSmartEOA.vue'
import ConnectEOAWallet from '@/components/signer/ConnectEOAWallet.vue'
import { AccountId, AccountType, ValidationOption } from '@/stores/useImportedAccounts'
import { defineStore, storeToRefs } from 'pinia'
import { useModal } from 'vue-final-modal'

// IAM: Import Account Modal

export enum IAMStageKey {
	INITIAL = 'INITIAL',

	// CONNECT_PASSKEY,
	// PASSKEY_ACCOUNT_OPTIONS,
	// CONFIRM_IMPORT_BY_PASSKEY,

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
	vOptions?: ValidationOption[]
	type?: AccountType
}

type ComponentProps<T> = T extends new () => { $props: infer P } ? P : never

export type IAMStage<T extends Component = Component> = {
	component: T
	next: IAMStageKey[]
	title?: string
	attrs?: ComponentProps<T>
	requiredFields?: string[] // required formData fields from previous stage
}

const IAM_CONFIG: Record<IAMStageKey, IAMStage<any>> = {
	[IAMStageKey.INITIAL]: {
		component: ImportOptions,
		next: [IAMStageKey.CONNECT_EOA_WALLET, IAMStageKey.CONNECT_SMART_EOA],
		title: 'Import Account',
	},

	// ========================================== EOA-Owned ==========================================

	[IAMStageKey.CONNECT_EOA_WALLET]: {
		component: ConnectEOAWallet,
		next: [IAMStageKey.EOA_ACCOUNT_OPTIONS],
		title: 'Connect EOA Wallet',
		attrs: {
			onConfirm: (address: string) => {
				useImportAccountModal().updateFormData({ vOptions: [{ type: 'EOA-Owned', publicKey: address }] })
				useImportAccountModal().goNextStage(IAMStageKey.EOA_ACCOUNT_OPTIONS)
			},
		},
		requiredFields: ['type'],
	},
	[IAMStageKey.EOA_ACCOUNT_OPTIONS]: {
		component: AccountOptions,
		next: [IAMStageKey.CONFIRM_IMPORT_BY_EOA],
		title: 'Select an Account',
		attrs: {
			mode: 'eoa',
			eoaAddress: () => {
				const vOption = useImportAccountModalStore().formData.vOptions?.find(v => v.type === 'EOA-Owned')
				if (!vOption) throw new Error('EOA_ACCOUNT_OPTIONS: No EOA address found')
				return vOption.publicKey
			},
			onAccountSelected: (account: { address: string; accountId: AccountId }) => {
				useImportAccountModal().updateFormData({
					address: account.address,
					accountId: account.accountId,
				})
				console.log(useImportAccountModalStore().formData)
				useImportAccountModal().goNextStage(IAMStageKey.CONFIRM_IMPORT_BY_EOA)
			},
		},
		requiredFields: ['vOptions'],
	},
	[IAMStageKey.CONFIRM_IMPORT_BY_EOA]: {
		component: ConfirmImport,
		next: [],
		title: 'Confirm Import',
		attrs: {
			address: () => useImportAccountModalStore().formData.address,
			accountId: () => useImportAccountModalStore().formData.accountId,
			type: () => useImportAccountModalStore().formData.type,
			vOptions: () => useImportAccountModalStore().formData.vOptions,
		},
		requiredFields: ['accountId', 'address'],
	},

	// ========================================== Smart EOA ==========================================

	[IAMStageKey.CONNECT_SMART_EOA]: {
		component: ConnectEOAWallet,
		next: [IAMStageKey.VALIDATE_SMART_EOA],
		title: 'Connect Smart EOA',
		attrs: {
			onConfirm: (address: string) => {
				useImportAccountModal().updateFormData({ address, type: 'Smart EOA' })
				useImportAccountModal().goNextStage(IAMStageKey.VALIDATE_SMART_EOA)
			},
		},
		requiredFields: ['type'],
	},
	[IAMStageKey.VALIDATE_SMART_EOA]: {
		component: ValidateSmartEOA,
		next: [IAMStageKey.CONFIRM_IMPORT_BY_SMART_EOA],
		title: 'Validate Smart EOA',
		attrs: {
			address: () => useImportAccountModalStore().formData.address,
			onConfirm: (accountId: AccountId) => {
				useImportAccountModal().updateFormData({ accountId })
				useImportAccountModal().goNextStage(IAMStageKey.CONFIRM_IMPORT_BY_SMART_EOA)
			},
		},
		requiredFields: ['address'],
	},
	[IAMStageKey.CONFIRM_IMPORT_BY_SMART_EOA]: {
		component: ConfirmImport,
		next: [],
		title: 'Confirm Import',
		attrs: {
			address: () => useImportAccountModalStore().formData.address,
			accountId: () => useImportAccountModalStore().formData.accountId,
			type: () => useImportAccountModalStore().formData.type,
			vOptions: () => [],
		},
		requiredFields: ['accountId'],
	},
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
