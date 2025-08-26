import { fetchSessions } from '@/api/smartsession/fetchSessions'
import { TESTNET_CHAIN_ID } from '@/stores/blockchain'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { ADDRESS, SmartSession__factory } from 'sendop'
import { SessionData } from './session'

export function useSessionList() {
	const { tenderlyClient, selectedChainId } = useBlockchain()

	const sessions = ref<SessionData[]>([])
	const loading = ref(false)
	const error = ref<string | null>(null)
	const expandedSessions = ref<Set<string>>(new Set())

	const smartsession = computed(() => SmartSession__factory.connect(ADDRESS.SmartSession, tenderlyClient.value))

	async function loadSessions(accountAddress: string) {
		error.value = null
		loading.value = true

		try {
			const currentBlock = await tenderlyClient.value.getBlockNumber()
			let fromBlock = 0
			if (selectedChainId.value === TESTNET_CHAIN_ID.BASE_SEPOLIA) {
				fromBlock = Math.max(0, currentBlock - 10000)
			}
			sessions.value = await fetchSessions(accountAddress, smartsession.value, fromBlock, currentBlock)
		} catch (e: unknown) {
			console.error('Error loading sessions:', e)
			error.value = 'Error loading sessions: ' + (e instanceof Error ? e.message : String(e))
		} finally {
			loading.value = false
		}
	}

	return {
		error,
		sessions,
		loading,
		expandedSessions,
		loadSessions,
	}
}
