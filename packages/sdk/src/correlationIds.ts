/**
 * Memory-only correlation ID storage for object-to-string mapping
 * Similar to KeyStorage but uses a Map for object keys
 */
export class CorrelationIdsStorage {
	private data: Map<object, string> = new Map()

	/**
	 * Get a correlation ID for an object
	 */
	get(key: object): string | undefined {
		return this.data.get(key)
	}

	/**
	 * Set a correlation ID for an object
	 */
	set(key: object, correlationId: string): void {
		this.data.set(key, correlationId)
	}

	/**
	 * Delete a correlation ID for an object
	 */
	delete(key: object): void {
		this.data.delete(key)
	}

	/**
	 * Clear all correlation IDs
	 */
	clear(): void {
		this.data.clear()
	}
}

// Export singleton instance
export const correlationIds = new CorrelationIdsStorage()
