function getEtherscanUrl() {
	return `${window.location.origin}/etherscan`
}

export async function fetchEthUsdPrice(): Promise<number> {
	const url = getEtherscanUrl() + '?chainid=1&module=stats&action=ethprice'
	const response = await fetch(url)
	const data = await response.json()

	if (data.error) {
		throw new Error(`Failed to fetch eth price: ${data.error}`)
	}

	if (data.status !== '1') {
		throw new Error(`Failed to fetch eth price: ${data.result}`)
	}
	return Number(data.result.ethusd)
}

export async function fetchAccountCode(address: string, chainId: string): Promise<string> {
	const url = `${getEtherscanUrl()}?chainid=${chainId}&module=proxy&action=eth_getCode&address=${address}&tag=latest`
	const response = await fetch(url)
	const data = await response.json()

	if (data.error) {
		throw new Error(data.error)
	}

	return data.result
}
