export const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY
export const PIMLICO_API_KEY = import.meta.env.VITE_PIMLICO_API_KEY

if (!ALCHEMY_API_KEY || !PIMLICO_API_KEY) {
	throw new Error('ALCHEMY_API_KEY or PIMLICO_API_KEY is not set')
}
