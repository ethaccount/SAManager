import { fetchSessions } from '@/api/smartsession/fetchSessions'
import { JsonRpcProvider } from 'ethers'
import { tenderly, TenderlyChain } from 'evm-providers'
import { ADDRESS, TSmartSession, TSmartSession__factory } from 'sendop'
import { getScheduledTransferSessionStatus } from './session'

/*

pnpm test src/lib/permissions/session.test.ts

*/

describe('lib.permissions.session', () => {
	let tenderlyClient: JsonRpcProvider
	let smartsession: TSmartSession
	const testAccountAddress = '0x47D6a8A65cBa9b61B194daC740AA192A7A1e91e1'

	beforeEach(() => {
		const tenderApiKey = import.meta.env.VITE_TEST_TENDERLY_API_KEY_SEPOLIA
		const chainIdNum = 11155111
		tenderlyClient = new JsonRpcProvider(tenderly(chainIdNum as TenderlyChain, tenderApiKey))

		smartsession = TSmartSession__factory.connect(ADDRESS.SmartSession, tenderlyClient)
	})

	it('should fetch sessions', async () => {
		const sessions = await fetchSessions(testAccountAddress, smartsession)
		console.log(sessions)

		expect(sessions).toBeDefined()

		for (const session of sessions) {
			const status = getScheduledTransferSessionStatus(session)
			if (status.isActionEnabled && status.isPermissionEnabled) {
				console.log('Found scheduled transfer session:', session)
				break
			}
		}
	})
})
