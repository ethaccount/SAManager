import { ref } from 'vue'

export enum EOAManagedStage {
	INITIAL,
	CONNECT_WALLET,
	ACCOUNT_CHOICE,
	CREATE_ACCOUNT,
	CONNECTED,
}

export enum PasskeyStage {
	INITIAL,
	LOGIN_OR_SIGNUP,
	SELECT_ACCOUNT,
	CREATE_ACCOUNT,
	CONNECTED,
}

export function useConnectStage() {
	const eoaManagedStage = ref<EOAManagedStage>(EOAManagedStage.INITIAL)
	const passkeyStage = ref<PasskeyStage>(PasskeyStage.INITIAL)

	function logCurrentStage() {
		console.log('EOAManagedStage', eoaManagedStage.value)
		console.log('PasskeyStage', passkeyStage.value)
	}

	return {
		eoaManagedStage,
		passkeyStage,

		logCurrentStage,
	}
}
