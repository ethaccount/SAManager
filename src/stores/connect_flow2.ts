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

type FlowStep = {
	stage: Stage
	next?: Stage[] // possible next stages
}

const FLOW_CONFIGS: {
	path: Path
	steps: FlowStep[]
}[] = [
	{
		path: Path.CREATE,
		steps: [
			{ stage: Stage.CREATE_SIGNER_CHOICE, next: [Stage.CONNECT_BY_EOA, Stage.CONNECT_BY_PASSKEY] },
			{ stage: Stage.CONNECT_BY_EOA, next: [Stage.SETUP] },
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
	selectedMethod: 'EOA' | 'PASSKEY' | 'EIP7702' | null
}

export const useConnectFlowStore = defineStore('useConnectFlowStore2', () => {
	const currentPath = ref<Path | null>(null)
	const currentStage = ref<Stage>(Stage.INITIAL)
	const stageHistory = ref<Stage[]>([Stage.INITIAL])
	const createPathData = ref<CreatePathData>({
		selectedMethod: null,
	})

	function reset() {
		currentStage.value = Stage.INITIAL
		currentPath.value = null
		stageHistory.value = [Stage.INITIAL]
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

	function goNext() {
		const nextStage = getNextPossibleStages()[0]
		if (nextStage) {
			navigateTo(nextStage)
		}
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
