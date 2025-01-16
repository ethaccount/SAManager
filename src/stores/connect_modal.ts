import InitialStep from '@/components/connect_modal/Initial.vue'
import CreateSignerChoice from '@/components/connect_modal/CreateSignerChoice.vue'
import EOAConnect from '@/components/connect_modal/EOAConnect.vue'
import PasskeyLogin from '@/components/connect_modal/PasskeyLogin.vue'
import CreateDeploy from '@/components/connect_modal/CreateDeploy.vue'
import Connected from '@/components/connect_modal/Connected.vue'

// Stage is the id of the step
export enum Stage {
	INITIAL = 'INITIAL',

	CREATE_SIGNER_CHOICE = 'CREATE_SIGNER_CHOICE',
	CREATE_EOA_CONNECT = 'CREATE_EOA_CONNECT',
	CREATE_PASSKEY_CONNECT = 'CREATE_PASSKEY_CONNECT',
	CREATE_EIP7702_CONNECT = 'CREATE_EIP7702_CONNECT',
	CREATE_DEPLOY = 'CREATE_DEPLOY',
	CREATE_CONNECTED = 'CREATE_CONNECTED',

	EOA_EOA_CONNECT = 'EOA_EOA_CONNECT',
}

type Step = {
	stage: Stage
	component: Component
	next: Stage[]
	metadata?: (ExtendedStepMetadata[keyof ExtendedStepMetadata] & BaseStepMetadata) | BaseStepMetadata
}

type Store = {
	eoaAddress: string | null
}

type BaseStepMetadata = {
	hasNextButton?: boolean
	requiredStore?: (keyof Store)[]
}

export type ExtendedStepMetadata = {
	[Stage.INITIAL]: {
		gotoCreate: () => void
		gotoEoa: () => void
	}
	[Stage.CREATE_SIGNER_CHOICE]: {
		gotoEoa: () => void
		gotoPasskey: () => void
	}
}

export const useConnectModalStore = defineStore('useConnectModalStore', () => {
	const STEPS: readonly Step[] = [
		{
			stage: Stage.INITIAL,
			component: InitialStep,
			next: [Stage.CREATE_SIGNER_CHOICE, Stage.EOA_EOA_CONNECT],
			metadata: {
				gotoCreate() {
					goNextStep(Stage.CREATE_SIGNER_CHOICE)
				},
				gotoEoa() {
					goNextStep(Stage.EOA_EOA_CONNECT)
				},
			} satisfies ExtendedStepMetadata[Stage.INITIAL],
		},
		// CREATE
		{
			stage: Stage.CREATE_SIGNER_CHOICE,
			component: CreateSignerChoice,
			next: [Stage.CREATE_EOA_CONNECT, Stage.CREATE_PASSKEY_CONNECT, Stage.CREATE_EIP7702_CONNECT],
		},
		{
			stage: Stage.CREATE_EOA_CONNECT,
			component: EOAConnect,
			next: [Stage.CREATE_DEPLOY],
			metadata: {
				hasNextButton: true,
				requiredStore: ['eoaAddress'],
			},
		},
		{
			stage: Stage.CREATE_PASSKEY_CONNECT,
			component: PasskeyLogin,
			next: [Stage.CREATE_DEPLOY],
		},
		{
			stage: Stage.CREATE_EIP7702_CONNECT,
			component: EOAConnect,
			next: [Stage.CREATE_DEPLOY],
		},
		{
			stage: Stage.CREATE_DEPLOY,
			component: CreateDeploy,
			next: [Stage.CREATE_CONNECTED],
		},
		{
			stage: Stage.CREATE_CONNECTED,
			component: Connected,
			next: [],
		},
		// EOA
		{
			stage: Stage.EOA_EOA_CONNECT,
			component: EOAConnect,
			next: [],
		},
	]

	const stage = ref<Stage | null>(null)
	const step = computed<Step | null>(() => {
		return STEPS.find(step => step.stage === stage.value) ?? null
	})
	const historyStage = ref<Stage[]>([])
	const historyStep = computed<Step[]>(() => {
		return historyStage.value.map(stage => {
			const found = STEPS.find(step => step.stage === stage)
			if (!found) {
				throw new Error(`Step not found for stage ${stage}`)
			}
			return found
		})
	})

	const reset = () => {
		stage.value = null
		historyStage.value = []
	}

	// ===============================
	// STORE
	// ===============================

	const store = ref<Store>({
		eoaAddress: null,
	})

	const updateStore = (update: Partial<Store>) => {
		store.value = { ...store.value, ...update }
	}

	// ===============================
	// STORE END
	// ===============================

	const canGoBack = computed(() => {
		return historyStage.value.length > 0
	})

	const canGoNext = computed(() => {
		return (step.value?.next.length ?? 0) > 0
	})

	const hasNextButton = computed(() => {
		return (step.value?.metadata?.hasNextButton ?? false) && canGoNext.value
	})

	const isValidTransition = (fromStage: Stage, toStage: Stage): boolean => {
		const currentStep = STEPS.find(step => step.stage === fromStage)

		// Check if the transition is allowed
		if (!currentStep?.next.includes(toStage)) {
			return false
		}

		// Check if required store values are filled
		const requiredStore = currentStep.metadata?.requiredStore
		if (requiredStore) {
			return requiredStore.every(key => store.value[key] !== null)
		}

		return true
	}

	const goNextStep = (specificStage?: Stage) => {
		// Initialize to INITIAL stage if no current stage
		if (!stage.value) {
			stage.value = Stage.INITIAL
			return
		}

		// Determine the next stage (either specified or first available)
		const nextStage = specificStage ?? step.value?.next[0]
		if (!nextStage) {
			throw new Error('No next stage found')
		}

		// Validate the transition
		if (!isValidTransition(stage.value, nextStage)) {
			throw new Error(`Invalid transition from ${stage.value} to ${nextStage}`)
		}

		// When using automatic next stage (no specificStage), validate there's only one option
		if (!specificStage && (step.value?.next.length ?? 0) === 0) {
			throw new Error('No next stage available')
		}

		if (!specificStage && (step.value?.next.length ?? 0) > 1) {
			console.warn('Multiple next stages available, using the first one')
		}

		// Update history and move to next stage
		historyStage.value.push(stage.value)
		stage.value = nextStage
	}

	const goBackStep = () => {
		if (historyStage.value.length === 0) {
			throw new Error('No history found')
		}
		const previousStage = historyStage.value.pop()
		if (previousStage) {
			stage.value = previousStage
		}
	}

	const checkStage = (_stage: Stage) => {
		if (stage.value !== _stage) {
			throw new Error(`Invalid stage, expected ${_stage} but got ${stage.value}`)
		}
	}

	return {
		stage,
		step,
		historyStage,
		historyStep,
		reset,
		goNextStep,
		goBackStep,
		checkStage,
		hasNextButton,
		canGoBack,
		canGoNext,
		store,
		updateStore,
	}
})

export function useConnectModal() {
	const store = useConnectModalStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
