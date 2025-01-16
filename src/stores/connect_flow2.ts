export enum Path {
	CREATE = 'CREATE',
	EOA_MANAGED = 'EOA_MANAGED',
	EIP7702 = 'EIP7702',
	PASSKEY = 'PASSKEY',
}

export enum Stage {
	// sub stages
	CREATE_SIGNER_CHOICE = 'CREATE_SIGNER_CHOICE',

	// common stages
	INITIAL = 'INITIAL',
	CONNECT_BY_EOA = 'CONNECT_BY_EOA',
	CONNECT_BY_PASSKEY = 'CONNECT_BY_PASSKEY',
	SETUP = 'SETUP',
	CONNECTED = 'CONNECTED',
}

type Step = {
	stage: Stage
	next?: Stage[] // possible next stages
	hasNextButton?: boolean
}

const FLOW_CONFIGS: {
	path: Path
	steps: Step[]
}[] = [
	{
		path: Path.CREATE,
		steps: [
			{ stage: Stage.CREATE_SIGNER_CHOICE, next: [Stage.CONNECT_BY_EOA, Stage.CONNECT_BY_PASSKEY] },
			{ stage: Stage.CONNECT_BY_EOA, next: [Stage.SETUP], hasNextButton: true },
			{ stage: Stage.CONNECT_BY_PASSKEY, next: [Stage.SETUP] },
			{ stage: Stage.SETUP, next: [Stage.CONNECTED] },
			{ stage: Stage.CONNECTED },
		],
	},
	{
		path: Path.EOA_MANAGED,
		steps: [
			{ stage: Stage.CONNECT_BY_EOA, next: [Stage.SETUP] },
			{ stage: Stage.SETUP, next: [Stage.CONNECTED] },
			{ stage: Stage.CONNECTED },
		],
	},
	{
		path: Path.EIP7702,
		steps: [
			{ stage: Stage.CONNECT_BY_EOA, next: [Stage.SETUP] },
			{ stage: Stage.SETUP, next: [Stage.CONNECTED] },
			{ stage: Stage.CONNECTED },
		],
	},
	{
		path: Path.PASSKEY,
		steps: [
			{ stage: Stage.CONNECT_BY_PASSKEY, next: [Stage.SETUP] },
			{ stage: Stage.SETUP, next: [Stage.CONNECTED] },
			{ stage: Stage.CONNECTED },
		],
	},
]

type CreatePathData = {
	selectedMethod?: 'EOA' | 'PASSKEY' | 'EIP7702'
	connectedAddress?: string
}

export const useConnectFlowStore = defineStore('useConnectFlowStore2', () => {
	const currentPath = ref<Path | null>(null)
	const currentStage = ref<Stage>(Stage.INITIAL)
	const stageHistory = ref<Stage[]>([Stage.INITIAL])
	const createPathData = ref<CreatePathData>({
		selectedMethod: undefined,
	})

	function reset() {
		currentStage.value = Stage.INITIAL
		currentPath.value = null
		stageHistory.value = [Stage.INITIAL]
		createPathData.value = {
			selectedMethod: undefined,
		}
	}

	function selectPath(path: Path) {
		currentPath.value = path
		const flow = FLOW_CONFIGS.find(f => f.path === path)
		if (flow) {
			navigateTo(flow.steps[0].stage) // navigate to the first step of the flow
		}
	}

	function getNextPossibleStages(): Stage[] {
		const flow = FLOW_CONFIGS.find(f => f.path === currentPath.value)
		const currentStep = flow?.steps.find(s => s.stage === currentStage.value)
		return currentStep?.next || []
	}

	const hasNextStage = computed<boolean>(() => {
		const flow = FLOW_CONFIGS.find(f => f.path === currentPath.value)
		const currentStep = flow?.steps.find(s => s.stage === currentStage.value)
		if (!currentStep) return false
		return !!currentStep.next
	})

	const hasNextButton = computed<boolean>(() => {
		const step = FLOW_CONFIGS.find(f => f.path === currentPath.value)?.steps.find(
			s => s.stage === currentStage.value,
		)
		if (!step) return false
		return hasNextStage.value && !!step.hasNextButton
	})

	const canGoBack = computed(() => stageHistory.value.length > 1)
	const previousStage = computed(() =>
		stageHistory.value.length > 1 ? stageHistory.value[stageHistory.value.length - 2] : null,
	)

	function navigateTo(stage: Stage) {
		console.log('navigateTo', stage)
		stageHistory.value.push(stage)
		currentStage.value = stage
	}

	function goBack() {
		if (stageHistory.value.length > 1) {
			stageHistory.value.pop() // Remove current stage
			currentStage.value = stageHistory.value[stageHistory.value.length - 1]
		}
	}

	function goNext(specificStage?: Stage) {
		const nextPossibleStages = getNextPossibleStages()
		if (nextPossibleStages.length === 0) return

		// If a specific stage is provided and it's valid, use it
		if (specificStage && nextPossibleStages.includes(specificStage)) {
			navigateTo(specificStage)
			return
		}

		// If there's only one possible next stage, use it
		if (nextPossibleStages.length === 1) {
			navigateTo(nextPossibleStages[0])
			return
		}

		// If we reach here, there are multiple possible stages and no specific one was chosen
		console.warn('Multiple next stages available, please specify which one to use:', nextPossibleStages)
	}

	function updatePathData_CREATE(data: CreatePathData) {
		createPathData.value = {
			...createPathData.value,
			...data,
		}
	}

	return {
		// state
		currentStage,
		currentPath,
		stageHistory,
		createPathData,
		canGoBack,
		previousStage,
		hasNextStage,
		hasNextButton,
		// methods
		reset,
		selectPath,
		getNextPossibleStages,
		goNext,
		navigateTo,
		goBack,
		updatePathData_CREATE,
	}
})

export function useConnectFlow() {
	const store = useConnectFlowStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
