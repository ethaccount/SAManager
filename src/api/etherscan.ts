function getEtherscanUrl() {
	return `${window.location.origin}/etherscan`
}

function handleEtherscanError(data: { error: string; status: string; result: string }) {
	if (data.error) {
		throw new Error(data.error)
	}

	if (data.status === '0') {
		throw new Error(data.result)
	}
}

export async function fetchEthUsdPrice(): Promise<number> {
	const url = getEtherscanUrl() + '?chainid=1&module=stats&action=ethprice'
	const response = await fetch(url)
	const data = await response.json()

	handleEtherscanError(data)

	return Number(data.result.ethusd)
}

export async function fetchAccountCode(address: string, chainId: string): Promise<string> {
	const url = `${getEtherscanUrl()}?chainid=${chainId}&module=proxy&action=eth_getCode&address=${address}&tag=latest`
	const response = await fetch(url)
	const data = await response.json()

	handleEtherscanError(data)

	return data.result
}
