import { computed, ref } from 'vue'

export enum CreateAccountStage {
	INITIAL,
	CHOOSE_ACCOUNT_TYPE_AND_VALIDATOR,
	CONNECT_EOA_OR_SIGNUP_PASSKEY,
	CONNECTED,
}

export enum EOAManagedStage {
	INITIAL,
	CONNECT_EOA,
	CHOOSE_ACCOUNT,
	CONNECTED,
}

export enum PasskeyStage {
	INITIAL,
	LOGIN,
	CHOOSE_ACCOUNT,
	CONNECTED,
}

export function useConnectStage() {
	const eoaManagedStage = ref<EOAManagedStage>(EOAManagedStage.INITIAL)
	const createAccountStage = ref<CreateAccountStage>(CreateAccountStage.INITIAL)
	const passkeyStage = ref<PasskeyStage>(PasskeyStage.INITIAL)

	const isInitialStage = computed(() => {
		return (
			eoaManagedStage.value === EOAManagedStage.INITIAL &&
			createAccountStage.value === CreateAccountStage.INITIAL &&
			passkeyStage.value === PasskeyStage.INITIAL
		)
	})

	const isConnected = computed(() => {
		return (
			eoaManagedStage.value === EOAManagedStage.CONNECTED ||
			createAccountStage.value === CreateAccountStage.CONNECTED ||
			passkeyStage.value === PasskeyStage.CONNECTED
		)
	})

	function toInitialStage() {
		eoaManagedStage.value = EOAManagedStage.INITIAL
		createAccountStage.value = CreateAccountStage.INITIAL
		passkeyStage.value = PasskeyStage.INITIAL
	}

	const logCurrentStage = () => {
		console.log('EOAManagedStage', eoaManagedStage.value)
		console.log('CreateAccountStage', createAccountStage.value)
		console.log('PasskeyStage', passkeyStage.value)
	}

	return {
		eoaManagedStage,
		createAccountStage,
		passkeyStage,

		isInitialStage,
		isConnected,

		toInitialStage,

		logCurrentStage,
	}
}
