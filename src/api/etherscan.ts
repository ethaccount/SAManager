function getEtherscanUrl() {
	return `${window.location.origin}/etherscan`
}

export async function fetchEthUsdPrice(): Promise<number> {
	const response = await fetch(getEtherscanUrl() + '?chainid=1&module=stats&action=ethprice')

	const data = await response.json()

	if (data.error) {
		throw new Error(`Failed to fetch eth price: ${data.error}`)
	}
	if (data.status !== '1') {
		throw new Error(`Failed to fetch eth price: ${data.result}`)
	}
	return Number(data.result.ethusd)
}
