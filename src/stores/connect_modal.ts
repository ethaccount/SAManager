import InitialStep from '@/components/connect_modal/Initial.vue'
import CreateSignerChoice from '@/components/connect_modal/CreateSignerChoice.vue'
import EOAConnect from '@/components/connect_modal/EOAConnect.vue'
import PasskeyLogin from '@/components/connect_modal/PasskeyLogin.vue'
import CreateDeploy from '@/components/connect_modal/CreateDeploy.vue'
import Connected from '@/components/connect_modal/Connected.vue'

export enum Stage {
	INITIAL = 'INITIAL',
	CREATE_SIGNER_CHOICE = 'CREATE_SIGNER_CHOICE',
	CREATE_EOA_CONNECT = 'CREATE_EOA_CONNECT',
	CREATE_PASSKEY_CONNECT = 'CREATE_PASSKEY_CONNECT',
	CREATE_DEPLOY = 'CREATE_DEPLOY',
	CREATE_CONNECTED = 'CREATE_CONNECTED',
}

type Step = {
	stage: Stage
	component: Component
	next: Stage[]
	metadata?: Record<string, any>
}

export const STEPS: readonly Step[] = [
	{
		stage: Stage.INITIAL,
		component: InitialStep,
		next: [Stage.CREATE_SIGNER_CHOICE],
	},
	// CREATE
	{
		stage: Stage.CREATE_SIGNER_CHOICE,
		component: CreateSignerChoice,
		next: [Stage.CREATE_EOA_CONNECT, Stage.CREATE_PASSKEY_CONNECT],
	},
	{
		stage: Stage.CREATE_EOA_CONNECT,
		component: EOAConnect,
		next: [Stage.CREATE_DEPLOY],
	},
	{
		stage: Stage.CREATE_PASSKEY_CONNECT,
		component: PasskeyLogin,
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
]

export const useConnectModalStore = defineStore('useConnectModalStore', () => {
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

	const start = () => {
		stage.value = Stage.INITIAL
	}

	const canGoBack = computed(() => {
		return historyStage.value.length > 0
	})

	const canGoNext = computed(() => {
		return (step.value?.next.length ?? 0) > 0
	})

	const goNextStep = () => {
		if ((step.value?.next.length ?? 0) === 0) {
			throw new Error('No next stage available')
		}

		const nextStage = step.value?.next[0]
		if (!nextStage) {
			console.error('No next stage found')
			return
		}

		stage.value && historyStage.value.push(stage.value)
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

	return {
		stage,
		step,
		historyStage,
		historyStep,
		reset,
		goNextStep,
		goBackStep,
		start,
		canGoBack,
		canGoNext,
	}
})

export function useConnectModal() {
	const store = useConnectModalStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
