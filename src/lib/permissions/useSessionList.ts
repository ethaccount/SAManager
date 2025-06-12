import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { ADDRESS, TSmartSession__factory } from 'sendop'
import { fetchSessions, SessionData } from './session'

export function useSessionList() {
	const { tenderlyClient } = useBlockchain()

	const sessions = ref<SessionData[]>([])
	const loading = ref(false)
	const error = ref<string | null>(null)
	const expandedSessions = ref<Set<string>>(new Set())

	const smartsession = computed(() => TSmartSession__factory.connect(ADDRESS.SmartSession, tenderlyClient.value))

	async function loadSessions(accountAddress: string) {
		error.value = null
		loading.value = true

		try {
			sessions.value = await fetchSessions(accountAddress, smartsession.value)
		} catch (e: unknown) {
			console.error('Error loading sessions:', e)
			error.value = e instanceof Error ? e.message : String(e)
		} finally {
			loading.value = false
		}
	}

	return {
		sessions,
		loading,
		expandedSessions,
		loadSessions,
	}
}
