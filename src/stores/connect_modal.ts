import Connected from '@/components/connect_modal/Connected.vue'
import CreateDeploy from '@/components/connect_modal/CreateDeploy.vue'
import CreateSignerChoice from '@/components/connect_modal/CreateSignerChoice.vue'
import EOAAccountChoice from '@/components/connect_modal/EOAAccountChoice.vue'
import EOAConnect from '@/components/connect_modal/EOAConnect.vue'
import InitialStep from '@/components/connect_modal/Initial.vue'
import PasskeyLogin from '@/components/connect_modal/PasskeyLogin.vue'
import { ValidatorKey, VendorKey } from '@/types'
import { useAccount } from './account'
import { useApp } from './app'

export enum ConnectModalStageKey {
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

type ConnectModalStage = {
	component: Component
	next: ConnectModalStageKey[]
	config?: ExtendedScreenConfig[keyof ExtendedScreenConfig] | BaseScreenConfig
}

type ConnectModalStore = {
	eoaAddress: string | null
	deployedAddress: string | null
	vendor: VendorKey | null
	validator: ValidatorKey | null
}

// Update metadata to config
type BaseScreenConfig = {
	title?: string
	hasNextButton?: boolean
	requiredStore?: (keyof ConnectModalStore)[]
	action?: {
		func: () => void
	}
}

// Update ExtendedStepMetadata to ExtendedScreenConfig
export type ExtendedScreenConfig = {
	[ConnectModalStageKey.INITIAL]: {
		gotoCreate: () => void
		gotoEoa: () => void
	} & BaseScreenConfig
	[ConnectModalStageKey.CREATE_SIGNER_CHOICE]: {
		gotoEoa: () => void
		gotoPasskey: () => void
	} & BaseScreenConfig
}

export const useConnectModalStore = defineStore('useConnectModalStore', () => {
	const CONNECT_MODAL_CONFIG: Partial<Record<ConnectModalStageKey, ConnectModalStage>> = {
		[ConnectModalStageKey.INITIAL]: {
			component: InitialStep,
			next: [ConnectModalStageKey.CREATE_SIGNER_CHOICE, ConnectModalStageKey.EOA_EOA_CONNECT],
			config: {
				title: 'Create or Connect',
				gotoCreate() {
					goNextStage(ConnectModalStageKey.CREATE_SIGNER_CHOICE)
				},
				gotoEoa() {
					updateStore({
						validator: 'eoa',
					})
					goNextStage(ConnectModalStageKey.EOA_EOA_CONNECT)
				},
			} satisfies ExtendedScreenConfig[ConnectModalStageKey.INITIAL],
		},
		// ===============================
		// CREATE
		// ===============================
		[ConnectModalStageKey.CREATE_SIGNER_CHOICE]: {
			component: CreateSignerChoice,
			next: [
				ConnectModalStageKey.CREATE_EOA_CONNECT,
				ConnectModalStageKey.CREATE_PASSKEY_CONNECT,
				ConnectModalStageKey.CREATE_EIP7702_CONNECT,
			],
			config: {
				title: 'Choose Signer',
				requiredStore: ['validator'],
			},
		},
		[ConnectModalStageKey.CREATE_EOA_CONNECT]: {
			component: EOAConnect,
			next: [ConnectModalStageKey.CREATE_DEPLOY],
			config: {
				title: 'Connect EOA Wallet',
				hasNextButton: true,
				requiredStore: ['eoaAddress'],
			},
		},
		[ConnectModalStageKey.CREATE_PASSKEY_CONNECT]: {
			component: PasskeyLogin,
			next: [ConnectModalStageKey.CREATE_DEPLOY],
		},
		[ConnectModalStageKey.CREATE_EIP7702_CONNECT]: {
			component: EOAConnect,
			next: [ConnectModalStageKey.CREATE_DEPLOY],
		},
		[ConnectModalStageKey.CREATE_DEPLOY]: {
			component: CreateDeploy,
			next: [ConnectModalStageKey.CREATE_CONNECTED],
			config: {
				title: 'Deploy Smart Account',
				requiredStore: ['eoaAddress', 'deployedAddress', 'vendor', 'validator'],
			},
		},
		[ConnectModalStageKey.CREATE_CONNECTED]: {
			component: Connected,
			next: [],
			config: {
				title: 'Connected',
			},
		},
		// ===============================
		// EOA
		// ===============================
		[ConnectModalStageKey.EOA_EOA_CONNECT]: {
			component: EOAConnect,
			next: [ConnectModalStageKey.EOA_ACCOUNT_CHOICE],
			config: {
				title: 'Connect EOA Wallet',
				hasNextButton: true,
				requiredStore: ['eoaAddress', 'validator'],
			},
		},
		[ConnectModalStageKey.EOA_ACCOUNT_CHOICE]: {
			component: EOAAccountChoice,
			next: [ConnectModalStageKey.EOA_CONNECTED],
			config: {
				title: 'Choose Account',
				requiredStore: ['eoaAddress', 'validator', 'deployedAddress'],
			},
		},
		[ConnectModalStageKey.EOA_CONNECTED]: {
			component: Connected,
			next: [],
			config: {
				title: 'Connected',
			},
		},
	} as const

	const stageKey = ref<ConnectModalStageKey | null>(null)
	const stage = computed<ConnectModalStage | null>(() => {
		if (!stageKey.value) return null
		return CONNECT_MODAL_CONFIG[stageKey.value] ?? null
	})
	const stageKeyHistory = ref<ConnectModalStageKey[]>([])
	const stageHistory = computed<ConnectModalStage[]>(() => {
		return stageKeyHistory.value.map(state => {
			if (!CONNECT_MODAL_CONFIG[state]) {
				throw new Error(`stageHistory: Screen not found for state: ${state}`)
			}
			return CONNECT_MODAL_CONFIG[state]
		})
	})

	// ===============================
	// STORE
	// ===============================

	const store = ref<ConnectModalStore>({
		eoaAddress: null,
		deployedAddress: null,
		vendor: null,
		validator: null,
	})

	const reset = () => {
		stageKey.value = null
		stageKeyHistory.value = []
		store.value = {
			eoaAddress: null,
			deployedAddress: null,
			vendor: null,
			validator: null,
		}
	}

	const updateStore = (update: Partial<ConnectModalStore>) => {
		store.value = { ...store.value, ...update }
	}

	// ===============================
	// STORE END
	// ===============================

	const canGoBack = computed(() => {
		return stageKeyHistory.value.length > 0
	})

	const canGoNext = computed(() => {
		return (stage.value?.next.length ?? 0) > 0
	})

	const hasNextButton = computed(() => {
		return (stage.value?.config?.hasNextButton ?? false) && canGoNext.value
	})

	const assertValidTransition = (fromState: ConnectModalStageKey, toState: ConnectModalStageKey) => {
		const stage = CONNECT_MODAL_CONFIG[fromState]

		if (!stage?.next.includes(toState)) {
			throw new Error(
				`Invalid transition from ${fromState} to ${toState}. Allowed transitions: ${stage?.next.join(', ')}`,
			)
		}

		const requiredStore = stage.config?.requiredStore
		if (requiredStore) {
			const missingFields = requiredStore.filter(key => store.value[key] === null)
			if (missingFields.length > 0) {
				throw new Error(`Missing required store fields: ${missingFields.join(', ')}`)
			}
		}
	}

	// Update navigation methods
	const goNextStage = (specificState?: ConnectModalStageKey) => {
		if (!stageKey.value) {
			stageKey.value = ConnectModalStageKey.INITIAL
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
			console.warn('Multiple next states available, using the first one')
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

	const assertStage = (_state: ConnectModalStageKey) => {
		if (stageKey.value !== _state) {
			throw new Error(`Invalid state, expected ${_state} but got ${stageKey.value}`)
		}
	}

	return {
		stageKey,
		stage,
		stageKeyHistory,
		stageHistory,
		reset,
		goNextStage,
		goBackStage,
		assertStage,
		hasNextButton,
		canGoBack,
		canGoNext,
		store,
		updateStore,
	}
})

export function useConnectModal() {
	const connectModalStore = useConnectModalStore()
	return {
		...connectModalStore,
		...storeToRefs(connectModalStore),
	}
}

// =============================== DEV ===============================

export function simulateStage(state: ConnectModalStageKey) {
	const { stageKey, updateStore } = useConnectModal()
	if (import.meta.env.DEV) {
		stageKey.value = state
		switch (state) {
			case ConnectModalStageKey.CREATE_CONNECTED:
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
			case ConnectModalStageKey.EOA_ACCOUNT_CHOICE:
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
