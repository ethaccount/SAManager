// import { env } from '@/app/useSetupEnv'
// import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
// import { PasskeyCredential } from './passkey'

// const credentials = 'include'

// /**
//  * Modified from zerodev sdk toWebAuthnKey()
//  */
// export async function register(username: string): Promise<PasskeyCredential> {
// 	// Get registration options
// 	const registerOptionsResponse = await fetch(`${env.VITE_PASSKEY_RP_URL}/register/options`, {
// 		method: 'POST',
// 		headers: {
// 			'Content-Type': 'application/json',
// 		},
// 		body: JSON.stringify({ username }),
// 		credentials,
// 	})
// 	const registerOptions = await registerOptionsResponse.json()
// 	console.log('registration optinos', registerOptions)

// 	// Start registration
// 	const registerCred = await startRegistration(registerOptions.options)

// 	const authenticatorId = registerCred.id
// 	console.log('authenticatorId', authenticatorId)

// 	// Verify registration
// 	const registerVerifyResponse = await fetch(`${env.VITE_PASSKEY_RP_URL}/register/verify`, {
// 		method: 'POST',
// 		headers: {
// 			'Content-Type': 'application/json',
// 		},
// 		body: JSON.stringify({
// 			userId: registerOptions.userId,
// 			username,
// 			cred: registerCred,
// 		}),
// 		credentials,
// 	})

// 	const registerVerifyResult = await registerVerifyResponse.json()
// 	if (!registerVerifyResult.verified) {
// 		throw new Error('Registration not verified')
// 	}

// 	const pubKey = registerCred.response.publicKey
// 	console.log('pubKey', pubKey)

// 	if (!pubKey) {
// 		throw new Error('No public key returned from registration credential')
// 	}
// 	if (!authenticatorId) {
// 		throw new Error('No authenticator id returned from registration credential')
// 	}

// 	const spkiDer = Buffer.from(pubKey, 'base64')
// 	const key = await crypto.subtle.importKey(
// 		'spki',
// 		spkiDer,
// 		{
// 			name: 'ECDSA',
// 			namedCurve: 'P-256',
// 		},
// 		true,
// 		['verify'],
// 	)

// 	// Export the key to the raw format
// 	const rawKey = await crypto.subtle.exportKey('raw', key)
// 	const rawKeyBuffer = Buffer.from(rawKey)

// 	// The first byte is 0x04 (uncompressed), followed by x and y coordinates (32 bytes each for P-256)
// 	const pubKeyX = rawKeyBuffer.subarray(1, 33).toString('hex')
// 	const pubKeyY = rawKeyBuffer.subarray(33).toString('hex')

// 	return {
// 		pubKeyX: `0x${pubKeyX}`,
// 		pubKeyY: `0x${pubKeyY}`,
// 		credentialId: authenticatorId,
// 		username,
// 	}
// }

// /**
//  * Modified from zerodev sdk toWebAuthnKey()
//  */
// export async function login(): Promise<Omit<PasskeyCredential, 'username'>> {
// 	// Get login options
// 	const loginOptionsResponse = await fetch(`${env.VITE_PASSKEY_RP_URL}/login/options`, {
// 		method: 'POST',
// 		headers: {
// 			'Content-Type': 'application/json',
// 		},

// 		credentials,
// 	})
// 	const loginOptions = await loginOptionsResponse.json()

// 	// Start authentication (login)
// 	const loginCred = await startAuthentication(loginOptions)

// 	const authenticatorId = loginCred.id
// 	console.log('authenticatorId', authenticatorId)

// 	// Verify authentication
// 	const loginVerifyResponse = await fetch(`${env.VITE_PASSKEY_RP_URL}/login/verify`, {
// 		method: 'POST',
// 		headers: {
// 			'Content-Type': 'application/json',
// 		},
// 		body: JSON.stringify({ cred: loginCred }),
// 		credentials,
// 	})

// 	const loginVerifyResult = await loginVerifyResponse.json()

// 	if (loginVerifyResult.error) {
// 		throw new Error(loginVerifyResult.error)
// 	}

// 	if (!loginVerifyResult.verification.verified) {
// 		throw new Error('Login not verified')
// 	}
// 	// Import the key
// 	const pubKey = loginVerifyResult.pubkey // Uint8Array pubkey

// 	console.log('pubKey', pubKey)

// 	if (!pubKey) {
// 		throw new Error('No public key returned from registration credential')
// 	}
// 	if (!authenticatorId) {
// 		throw new Error('No authenticator id returned from registration credential')
// 	}

// 	// const authenticatorIdHash = keccak256(decodeBase64URL(authenticatorId))

// 	const spkiDer = Buffer.from(pubKey, 'base64')
// 	const key = await crypto.subtle.importKey(
// 		'spki',
// 		spkiDer,
// 		{
// 			name: 'ECDSA',
// 			namedCurve: 'P-256',
// 		},
// 		true,
// 		['verify'],
// 	)

// 	// Export the key to the raw format
// 	const rawKey = await crypto.subtle.exportKey('raw', key)
// 	const rawKeyBuffer = Buffer.from(rawKey)

// 	// The first byte is 0x04 (uncompressed), followed by x and y coordinates (32 bytes each for P-256)
// 	const pubKeyX = rawKeyBuffer.subarray(1, 33).toString('hex')
// 	const pubKeyY = rawKeyBuffer.subarray(33).toString('hex')

// 	return {
// 		pubKeyX: `0x${pubKeyX}`,
// 		pubKeyY: `0x${pubKeyY}`,
// 		credentialId: authenticatorId,
// 	}
// }
