export enum ConnectStage {
	// Initial selection stage
	INITIAL = 'INITIAL',

	// Main paths
	CREATE = 'CREATE',
	EIP7702 = 'EIP7702',
	EOA_MANAGED = 'EOA_MANAGED',
	PASSKEY = 'PASSKEY',

	// Common stages
	CONNECT_WALLET = 'CONNECT_WALLET',
	PASSKEY_LOGIN = 'PASSKEY_LOGIN',
	CONNECTED = 'CONNECTED',
}

type CreateAccountData = {
	validator?: string
	vendor?: string
	deployedAddress?: string
}

type EOAManagedData = {
	vendor?: string
	selectedAccount?: string
}

type PasskeyData = {
	vendor?: string
	username?: string
	deviceName?: string
}

type WalletConnectionConfig = {
	requiresValidator: boolean
	requiresVendor: boolean
	requiresAccountSelection: boolean
}

type WalletConnectionData = {
	vendor?: string
	validator?: string
	selectedAccount?: string
	deployedAddress?: string
}

type StageData = {
	create: CreateAccountData
	eoaManaged: EOAManagedData
	passkey: PasskeyData
	walletConnection: WalletConnectionData
}

export const useConnectFlowStore = defineStore('useConnectFlowStore', () => {
	const currentStage = ref<ConnectStage>(ConnectStage.INITIAL)
	const selectedPath = ref<ConnectStage | null>(null)

	const stageData = reactive<StageData>({
		create: {},
		eoaManaged: {},
		passkey: {},
		walletConnection: {},
	})

	const walletConfigByPath: Record<ConnectStage, WalletConnectionConfig> = {
		[ConnectStage.CREATE]: {
			requiresValidator: true,
			requiresVendor: true,
			requiresAccountSelection: false,
		},
		[ConnectStage.EOA_MANAGED]: {
			requiresValidator: false,
			requiresVendor: true,
			requiresAccountSelection: true,
		},
		[ConnectStage.EIP7702]: {
			requiresValidator: false,
			requiresVendor: true,
			requiresAccountSelection: false,
		},
		// Add other paths as needed
	}

	// Get current wallet connection configuration based on selected path
	const currentWalletConfig = computed(() => (selectedPath.value ? walletConfigByPath[selectedPath.value] : null))

	// Validate wallet connection data based on current configuration
	const isWalletDataValid = computed(() => {
		if (!currentWalletConfig.value) return false

		const { requiresValidator, requiresVendor, requiresAccountSelection } = currentWalletConfig.value
		const { validator, vendor, selectedAccount } = stageData.walletConnection

		return (
			(!requiresValidator || !!validator) &&
			(!requiresVendor || !!vendor) &&
			(!requiresAccountSelection || !!selectedAccount)
		)
	})

	// Set wallet connection data with validation
	function setWalletConnectionData(data: Partial<WalletConnectionData>) {
		stageData.walletConnection = { ...stageData.walletConnection, ...data }
	}

	const canConnectWallet = computed(() => {
		return [ConnectStage.CREATE, ConnectStage.EIP7702, ConnectStage.EOA_MANAGED].includes(selectedPath.value!)
	})

	function selectPath(path: ConnectStage) {
		selectedPath.value = path

		if (path === ConnectStage.PASSKEY) {
			currentStage.value = ConnectStage.PASSKEY_LOGIN
		} else if (canConnectWallet.value) {
			currentStage.value = ConnectStage.CONNECT_WALLET
		}
	}

	function moveToConnected() {
		currentStage.value = ConnectStage.CONNECTED
	}

	function reset() {
		currentStage.value = ConnectStage.INITIAL
		selectedPath.value = null
	}

	return {
		currentStage,
		selectedPath,
		selectPath,
		moveToConnected,
		reset,
		stageData,
		walletConfigByPath,
		currentWalletConfig,
		isWalletDataValid,
		setWalletConnectionData,
	}
})
