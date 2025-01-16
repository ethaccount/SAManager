import ConnectModal from '@/components/connect_modal/ConnectModal.vue'
import Connected from '@/components/connect_modal/Connected.vue'
import CreateDeploy from '@/components/connect_modal/CreateDeploy.vue'
import CreateSignerChoice from '@/components/connect_modal/CreateSignerChoice.vue'
import EOAConnect from '@/components/connect_modal/EOAConnect.vue'
import EOAAccountChoice from '@/components/connect_modal/EOAAccountChoice.vue'
import InitialStep from '@/components/connect_modal/Initial.vue'
import PasskeyLogin from '@/components/connect_modal/PasskeyLogin.vue'
import { ValidatorKey, VendorKey } from '@/types'
import { useModal } from 'vue-final-modal'
import { useAccount } from './account'
import { useApp } from './app'

// Change Stage to ConnectFlowState
export enum ConnectFlowState {
	INITIAL = 'INITIAL',

	CREATE_SIGNER_CHOICE = 'CREATE_SIGNER_CHOICE',
	CREATE_EOA_CONNECT = 'CREATE_EOA_CONNECT',
	CREATE_PASSKEY_CONNECT = 'CREATE_PASSKEY_CONNECT',
	CREATE_EIP7702_CONNECT = 'CREATE_EIP7702_CONNECT',
	CREATE_DEPLOY = 'CREATE_DEPLOY',
	CREATE_CONNECTED = 'CREATE_CONNECTED',

	EOA_EOA_CONNECT = 'EOA_EOA_CONNECT',
	EOA_ACCOUNT_CHOICE = 'EOA_ACCOUNT_CHOICE',
	EOA_CONNECTED = 'EOA_CONNECTED',

	PASSKEY_LOGIN = 'PASSKEY_LOGIN',
	PASSKEY_ACCOUNT_CHOICE = 'PASSKEY_ACCOUNT_CHOICE',
	PASSKEY_CONNECTED = 'PASSKEY_CONNECTED',
}

// Update Step to ModalScreen and related properties
type ModalScreen = {
	state: ConnectFlowState
	component: Component
	next: ConnectFlowState[]
	screenConfig?: ExtendedScreenConfig[keyof ExtendedScreenConfig] | BaseScreenConfig
}

type Store = {
	eoaAddress: string | null
	deployedAddress: string | null
	vendor: VendorKey | null
	validator: ValidatorKey | null
}

// Update metadata to screenConfig
type BaseScreenConfig = {
	title?: string
	hasNextButton?: boolean
	requiredStore?: (keyof Store)[]
	action?: {
		func: () => void
	}
}

// Update ExtendedStepMetadata to ExtendedScreenConfig
export type ExtendedScreenConfig = {
	[ConnectFlowState.INITIAL]: {
		gotoCreate: () => void
		gotoEoa: () => void
	} & BaseScreenConfig
	[ConnectFlowState.CREATE_SIGNER_CHOICE]: {
		gotoEoa: () => void
		gotoPasskey: () => void
	} & BaseScreenConfig
}

export const useConnectModalStore = defineStore('useConnectModalStore', () => {
	const { open, close } = useModal({
		component: ConnectModal,
		attrs: {
			onClose: () => close(),
		},
		slots: {},
	})

	// Update STEPS to SCREENS
	const SCREENS: Partial<Record<ConnectFlowState, ModalScreen>> = {
		[ConnectFlowState.INITIAL]: {
			state: ConnectFlowState.INITIAL,
			component: InitialStep,
			next: [ConnectFlowState.CREATE_SIGNER_CHOICE, ConnectFlowState.EOA_EOA_CONNECT],
			screenConfig: {
				title: 'Create or Connect',
				gotoCreate() {
					goNextState(ConnectFlowState.CREATE_SIGNER_CHOICE)
				},
				gotoEoa() {
					updateStore({
						validator: 'eoa',
					})
					goNextState(ConnectFlowState.EOA_EOA_CONNECT)
				},
			} satisfies ExtendedScreenConfig[ConnectFlowState.INITIAL],
		},
		// ===============================
		// CREATE
		// ===============================
		[ConnectFlowState.CREATE_SIGNER_CHOICE]: {
			state: ConnectFlowState.CREATE_SIGNER_CHOICE,
			component: CreateSignerChoice,
			next: [
				ConnectFlowState.CREATE_EOA_CONNECT,
				ConnectFlowState.CREATE_PASSKEY_CONNECT,
				ConnectFlowState.CREATE_EIP7702_CONNECT,
			],
			screenConfig: {
				title: 'Choose Signer',
				requiredStore: ['validator'],
			},
		},
		[ConnectFlowState.CREATE_EOA_CONNECT]: {
			state: ConnectFlowState.CREATE_EOA_CONNECT,
			component: EOAConnect,
			next: [ConnectFlowState.CREATE_DEPLOY],
			screenConfig: {
				title: 'Connect EOA Wallet',
				hasNextButton: true,
				requiredStore: ['eoaAddress'],
			},
		},
		[ConnectFlowState.CREATE_PASSKEY_CONNECT]: {
			state: ConnectFlowState.CREATE_PASSKEY_CONNECT,
			component: PasskeyLogin,
			next: [ConnectFlowState.CREATE_DEPLOY],
		},
		[ConnectFlowState.CREATE_EIP7702_CONNECT]: {
			state: ConnectFlowState.CREATE_EIP7702_CONNECT,
			component: EOAConnect,
			next: [ConnectFlowState.CREATE_DEPLOY],
		},
		[ConnectFlowState.CREATE_DEPLOY]: {
			state: ConnectFlowState.CREATE_DEPLOY,
			component: CreateDeploy,
			next: [ConnectFlowState.CREATE_CONNECTED],
			screenConfig: {
				title: 'Deploy Smart Account',
				requiredStore: ['eoaAddress', 'deployedAddress', 'vendor', 'validator'],
			},
		},
		[ConnectFlowState.CREATE_CONNECTED]: {
			state: ConnectFlowState.CREATE_CONNECTED,
			component: Connected,
			next: [],
			screenConfig: {
				title: 'Connected',
			},
		},
		// ===============================
		// EOA
		// ===============================
		[ConnectFlowState.EOA_EOA_CONNECT]: {
			state: ConnectFlowState.EOA_EOA_CONNECT,
			component: EOAConnect,
			next: [ConnectFlowState.EOA_ACCOUNT_CHOICE],
			screenConfig: {
				title: 'Connect EOA Wallet',
				hasNextButton: true,
				requiredStore: ['eoaAddress', 'validator'],
			},
		},
		[ConnectFlowState.EOA_ACCOUNT_CHOICE]: {
			state: ConnectFlowState.EOA_ACCOUNT_CHOICE,
			component: EOAAccountChoice,
			next: [ConnectFlowState.EOA_CONNECTED],
			screenConfig: {
				title: 'Choose Account',
				requiredStore: ['eoaAddress', 'validator', 'deployedAddress'],
			},
		},
		[ConnectFlowState.EOA_CONNECTED]: {
			state: ConnectFlowState.EOA_CONNECTED,
			component: Connected,
			next: [],
		},
	} as const

	// Update state/step variables to currentState/currentScreen
	const currentState = ref<ConnectFlowState | null>(null)
	const currentScreen = computed<ModalScreen | null>(() => {
		if (!currentState.value) return null
		return SCREENS[currentState.value] ?? null
	})
	const stateHistory = ref<ConnectFlowState[]>([])
	const screenHistory = computed<ModalScreen[]>(() => {
		return stateHistory.value.map(state => {
			if (!SCREENS[state]) {
				throw new Error(`screenHistory: Screen not found for state: ${state}`)
			}
			return SCREENS[state]
		})
	})

	// ===============================
	// STORE
	// ===============================

	const store = ref<Store>({
		eoaAddress: null,
		deployedAddress: null,
		vendor: null,
		validator: null,
	})

	const reset = () => {
		currentState.value = null
		stateHistory.value = []
		store.value = {
			eoaAddress: null,
			deployedAddress: null,
			vendor: null,
			validator: null,
		}
	}

	const updateStore = (update: Partial<Store>) => {
		store.value = { ...store.value, ...update }
	}

	// ===============================
	// STORE END
	// ===============================

	const canGoBack = computed(() => {
		return stateHistory.value.length > 0
	})

	const canGoNext = computed(() => {
		return (currentScreen.value?.next.length ?? 0) > 0
	})

	const hasNextButton = computed(() => {
		return (currentScreen.value?.screenConfig?.hasNextButton ?? false) && canGoNext.value
	})

	const assertValidTransition = (fromState: ConnectFlowState, toState: ConnectFlowState) => {
		const currentScreen = SCREENS[fromState]

		if (!currentScreen?.next.includes(toState)) {
			throw new Error(
				`Invalid transition from ${fromState} to ${toState}. Allowed transitions: ${currentScreen?.next.join(
					', ',
				)}`,
			)
		}

		const requiredStore = currentScreen.screenConfig?.requiredStore
		if (requiredStore) {
			const missingFields = requiredStore.filter(key => store.value[key] === null)
			if (missingFields.length > 0) {
				throw new Error(`Missing required store fields: ${missingFields.join(', ')}`)
			}
		}
	}

	// Update navigation methods
	const goNextState = (specificState?: ConnectFlowState) => {
		if (!currentState.value) {
			currentState.value = ConnectFlowState.INITIAL
			return
		}

		const nextState = specificState ?? currentScreen.value?.next[0]
		if (!nextState) {
			throw new Error('No next state found')
		}

		assertValidTransition(currentState.value, nextState)

		if (!specificState && (currentScreen.value?.next.length ?? 0) === 0) {
			throw new Error('No next state available')
		}

		if (!specificState && (currentScreen.value?.next.length ?? 0) > 1) {
			console.warn('Multiple next states available, using the first one')
		}

		stateHistory.value.push(currentState.value)
		currentState.value = nextState
	}

	const goBackState = () => {
		if (stateHistory.value.length === 0) {
			throw new Error('No history found')
		}
		const previousState = stateHistory.value.pop()
		if (previousState) {
			currentState.value = previousState
		}
	}

	const assertState = (_state: ConnectFlowState) => {
		if (currentState.value !== _state) {
			throw new Error(`Invalid state, expected ${_state} but got ${currentState.value}`)
		}
	}

	return {
		currentState,
		currentScreen,
		stateHistory,
		screenHistory,
		reset,
		goNextState,
		goBackState,
		assertState,
		hasNextButton,
		canGoBack,
		canGoNext,
		store,
		updateStore,
		open,
		close,
	}
})

export function useConnectModal() {
	const store = useConnectModalStore()
	return {
		...store,
		...storeToRefs(store),
	}
}

// =============================== DEV ===============================

export function simulateScreen(state: ConnectFlowState) {
	const { open, currentState, updateStore } = useConnectModal()
	if (import.meta.env.DEV) {
		open()

		currentState.value = state
		switch (state) {
			case ConnectFlowState.CREATE_CONNECTED:
				const { chainId } = useApp()
				const account = {
					chainId: chainId.value,
					eoaAddress: '0x0924E969a99547374C9F4B43503652fdB28289e4',
					deployedAddress: '0x0924E969a99547374C9F4B43503652fdB28289e4',
					vendor: 'kernel' as VendorKey,
					validator: 'eoa' as ValidatorKey,
				}
				const { setAccount } = useAccount()
				setAccount({
					address: account.deployedAddress,
					chainId: account.chainId,
					vendor: account.vendor,
					validator: account.validator,
				})

				updateStore({
					eoaAddress: account.eoaAddress,
					deployedAddress: account.deployedAddress,
					vendor: account.vendor,
					validator: account.validator,
				})
				break
			case ConnectFlowState.EOA_ACCOUNT_CHOICE:
				updateStore({
					validator: 'eoa',
					eoaAddress: '0xd78B5013757Ea4A7841811eF770711e6248dC282',
				})
				break
			default:
				throw new Error(`Unknown state: ${state}`)
		}
	} else {
		throw new Error('Simulate screen is only available in development mode')
	}
}
