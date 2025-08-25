/**
 * Memory-only key storage for session-based parent-popup communication
 * More secure and performant than localStorage for ephemeral keys
 */
export class KeyStorage {
	private data: Record<string, string | null> = {}

	/**
	 * Get a stored key value
	 */
	get(key: string): string | null {
		return this.data[key] ?? null
	}

	/**
	 * Set a key value
	 */
	set(key: string, value: string | null): void {
		this.data[key] = value
	}

	/**
	 * Clear all stored keys
	 */
	clear(): void {
		this.data = {}
	}
}

// Export singleton instance
export const keyStorage = new KeyStorage()
