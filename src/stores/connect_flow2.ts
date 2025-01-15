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

export type PathData = {
	create: {
		selectedMethod?: 'EOA' | 'PASSKEY'
	}
	eoaManaged: {}
	passkey: {}
	walletConnection: {}
}

type FlowStep = {
	stage: Stage
	next?: Stage[] // possible next stages
}

// CREATE -> CREATE_SIGNER_CHOICE -> CONNECT_BY_EOA -> SETUP -> CONNECTED
// CREATE -> CREATE_SIGNER_CHOICE -> CONNECT_BY_PASSKEY -> SETUP -> CONNECTED
// EOA_MANAGED -> CONNECT_BY_EOA -> SETUP -> CONNECTED
// EIP7702 -> CONNECT_BY_EIP7702 -> SETUP -> CONNECTED
// PASSKEY -> CONNECT_BY_PASSKEY -> SETUP -> CONNECTED
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
]

export const useConnectFlowStore = defineStore('useConnectFlowStore2', () => {
	const currentPath = ref<Path | null>(null)
	const currentStage = ref<Stage>(Stage.INITIAL)
	const stageHistory = ref<Stage[]>([Stage.INITIAL])
	const pathData = reactive<PathData>({
		create: {},
		eoaManaged: {},
		passkey: {},
		walletConnection: {},
	})

	function reset() {
		currentStage.value = Stage.INITIAL
		currentPath.value = null
		stageHistory.value = [Stage.INITIAL]
		pathData.create = {}
		pathData.eoaManaged = {}
		pathData.passkey = {}
		pathData.walletConnection = {}
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

	return {
		// state
		currentStage: computed(() => currentStage.value),
		currentPath: computed(() => currentPath.value),
		stageHistory: computed(() => stageHistory.value),
		pathData: computed(() => pathData),

		// methods
		reset,
		selectPath,
		getNextPossibleStages,
		canGoBack,
		previousStage,
		navigateTo,
		goBack,
	}
})

export function useConnectFlow() {
	const store = useConnectFlowStore()
	return {
		...storeToRefs(store),
		reset: store.reset,
		selectPath: store.selectPath,
		getNextPossibleStages: store.getNextPossibleStages,
		canGoBack: store.canGoBack,
		previousStage: store.previousStage,
		navigateTo: store.navigateTo,
		goBack: store.goBack,
	}
}
