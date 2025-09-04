const SUPPORTED_CAPABILITIES = ['atomic', 'paymasterService']

export function isSupportedCapability(_sender: string, capabilityName: string): boolean {
	return SUPPORTED_CAPABILITIES.includes(capabilityName)
}
