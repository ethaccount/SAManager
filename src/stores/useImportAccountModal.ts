import ImportAccountModal from '@/components/ImportAccountModal/ImportAccountModal.vue'
import ImportOptions from '@/components/ImportAccountModal/ImportOptions.vue'
import { defineStore, storeToRefs } from 'pinia'
import { ref, computed, Component } from 'vue'
import { useModal } from 'vue-final-modal'

export enum ImportModalStageKey {
	INITIAL = 'INITIAL',
}

type Stage = {
	component: Component
	next: ImportModalStageKey[]
	config: {
		title?: string
		requiredFields?: string[]
	}
}

const IMPORT_MODAL_CONFIG: Record<ImportModalStageKey, Stage> = {
	[ImportModalStageKey.INITIAL]: {
		component: ImportOptions,
		next: [],
		config: {
			title: 'Import Account',
		},
	},
}

export const useImportAccountModalStore = defineStore('useImportAccountModalStore', () => {
	const stageKey = ref<ImportModalStageKey | null>(ImportModalStageKey.INITIAL)
	const stageKeyHistory = ref<ImportModalStageKey[]>([])
	const stage = computed<Stage | null>(() => {
		if (!stageKey.value) return null
		return IMPORT_MODAL_CONFIG[stageKey.value] ?? null
	})

	const reset = () => {
		stageKey.value = ImportModalStageKey.INITIAL
		stageKeyHistory.value = []
	}

	const canGoBack = computed(() => {
		return stageKeyHistory.value.length > 0
	})

	const canGoNext = computed(() => {
		return (stage.value?.next.length ?? 0) > 0
	})

	const goNextStage = (specificState?: ImportModalStageKey) => {
		if (!stageKey.value) {
			stageKey.value = ImportModalStageKey.INITIAL
			return
		}

		const nextState = specificState ?? stage.value?.next[0]
		if (!nextState) {
			throw new Error('No next state found')
		}

		assertValidTransition(stageKey.value, nextState)

		if (!specificState && (stage.value?.next.length ?? 0) === 0) {
			throw new Error('No next state available')
		}

		if (!specificState && (stage.value?.next.length ?? 0) > 1) {
			console.warn(
				`Multiple next states available on ${stageKey.value}, using the first one ${stage.value?.next[0]}`,
			)
		}

		stageKeyHistory.value.push(stageKey.value)
		stageKey.value = nextState
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
	}
})

export function useImportAccountModal() {
	const store = useImportAccountModalStore()
	return {
		...store,
		...storeToRefs(store),
	}
}

const assertValidTransition = (fromStateKey: ImportModalStageKey, toStateKey: ImportModalStageKey) => {
	const fromStage = IMPORT_MODAL_CONFIG[fromStateKey]
	const toStage = IMPORT_MODAL_CONFIG[toStateKey]

	if (!fromStage?.next.includes(toStateKey)) {
		throw new Error(
			`Invalid transition from ${fromStateKey} to ${toStateKey}. Allowed transitions: ${fromStage?.next.join(
				', ',
			)}`,
		)
	}

	const requiredFields = toStage.config?.requiredFields
	// if (requiredFields) {
	// 	const missingFields = requiredFields.filter(key => !store.value[key])
	// 	if (missingFields.length > 0) {
	// 		throw new Error(`Missing required fields for ${toStateKey}: ${missingFields.join(', ')}`)
	// 	}
	// }
}
