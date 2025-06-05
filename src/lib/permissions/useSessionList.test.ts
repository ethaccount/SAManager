import { createPinia, setActivePinia } from 'pinia'
import { useSessionList } from './useSessionList'
import { getScheduledTransferSessionStatus } from './session'

// TODO: Fix this test

describe('useSessionList integration test', () => {
	beforeEach(() => {
		// Setup Pinia for each test
		const pinia = createPinia()
		setActivePinia(pinia)
	})

	it('should check for scheduled transfer session with real connection', async () => {
		// Setup account - you'll need to provide a real account address
		const testAccountAddress = '0x47D6a8A65cBa9b61B194daC740AA192A7A1e91e1'

		let isSessionExist = false
		let existingPermissionId: string | null = null

		const { sessions, loadSessions } = useSessionList()
		await loadSessions(testAccountAddress)

		for (const session of sessions.value) {
			const status = getScheduledTransferSessionStatus(session)
			if (status.isActionEnabled && status.isPermissionEnabled) {
				isSessionExist = true
				existingPermissionId = session.permissionId
				break
			}
		}

		// Assert the results
		console.log('Sessions found:', sessions.value.length)
		console.log('Session exists:', isSessionExist)
		console.log('Existing permission ID:', existingPermissionId)

		// Basic assertions
		expect(sessions.value).toBeDefined()
		expect(Array.isArray(sessions.value)).toBe(true)
		expect(typeof isSessionExist).toBe('boolean')

		if (existingPermissionId) {
			expect(typeof existingPermissionId).toBe('string')
			expect(existingPermissionId.length).toBeGreaterThan(0)
		}
	}, 30000) // 30 second timeout for blockchain calls
})
