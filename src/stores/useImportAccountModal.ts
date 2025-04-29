import AccountOptions from '@/components/ImportAccountModal/AccountOptions.vue'
import ConfirmImport from '@/components/ImportAccountModal/ConfirmImport.vue'
import ImportAccountModal from '@/components/ImportAccountModal/ImportAccountModal.vue'
import ImportOptions from '@/components/ImportAccountModal/ImportOptions.vue'
import ConnectEOAWallet from '@/components/signer/ConnectEOAWallet.vue'
import { defineStore, storeToRefs } from 'pinia'
import { ref, computed, Component } from 'vue'
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

	// CONNECT_SMART_EOA,
	// CONFIRM_IMPORT_BY_SMART_EOA,

	// ADDRESS_INPUT,
	// ADDRESS_VALIDATION,
	// CONFIRM_IMPORT_BY_ADDRESS,
}

/*

passkey -> connect passkey -> passkey account options -> confirm import
eoa -> connect eoa -> eoa account options -> confirm import
smart eoa -> connect eoa -> confirm import
address -> input address -> address validation -> connect eoa or passkey -> confirm import

*/

type IAMFormData = {
	address?: string
}

// Type-safe component props
type ComponentProps<T> = T extends new () => { $props: infer P } ? P : never

export type IAMStage<T extends Component = Component> = {
	component: T
	next: IAMStageKey[]
	title?: string
	attrs?: ComponentProps<T>
	requiredFields?: string[]
}

const IAM_CONFIG: Record<IAMStageKey, IAMStage<any>> = {
	[IAMStageKey.INITIAL]: {
		component: ImportOptions,
		next: [IAMStageKey.CONNECT_EOA_WALLET],
		title: 'Import Account',
	},
	[IAMStageKey.CONNECT_EOA_WALLET]: {
		component: ConnectEOAWallet,
		next: [IAMStageKey.EOA_ACCOUNT_OPTIONS],
		title: 'Connect EOA Wallet',
		attrs: {
			onConfirm: (address: string) => {
				const store = useImportAccountModalStore()
				store.updateFormData({ address })
				store.goNextStage(IAMStageKey.EOA_ACCOUNT_OPTIONS)
			},
		},
	},
	[IAMStageKey.EOA_ACCOUNT_OPTIONS]: {
		component: AccountOptions,
		next: [IAMStageKey.CONFIRM_IMPORT_BY_EOA],
		title: 'Select an Account',
		attrs: {
			mode: 'eoa',
			eoaAddress: () => useImportAccountModalStore().formData.address,
		},
	},
	[IAMStageKey.CONFIRM_IMPORT_BY_EOA]: {
		component: ConfirmImport,
		next: [],
		title: 'Confirm Import',
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

	if (!fromStage?.next.includes(toStateKey)) {
		throw new Error(
			`Invalid transition from ${fromStateKey} to ${toStateKey}. Allowed transitions: ${fromStage?.next.join(
				', ',
			)}`,
		)
	}

	const requiredFields = toStage.requiredFields
	// if (requiredFields) {
	// 	const missingFields = requiredFields.filter(key => !store.value[key])
	// 	if (missingFields.length > 0) {
	// 		throw new Error(`Missing required fields for ${toStateKey}: ${missingFields.join(', ')}`)
	// 	}
	// }
}
