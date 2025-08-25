# SAManager SDK

## Usage

```ts
// EIP-6963
announceSAManagerProvider({
    debug: true,
    chainId: 84532n,
    origin: 'https://testnet.samanager.xyz',
})

// or
const provider = new SAManagerProvider({
    debug: true,
    chainId: 84532n,
    origin: 'https://testnet.samanager.xyz',
})

// =================================== EIP-1193 & EIP-5792 ===================================

await provider.request({
    method: 'eth_getBlockByNumber',
    params: ['latest', false],
})

await provider.request({
    method: 'wallet_getCapabilities',
    params: [address, ['0x14a34']],
})

await provider.request({
    method: 'wallet_sendCalls',
    params: [
        {
            version: '1.0',
            chainId: '0x14a34',
            from: address,
            atomicRequired: true,
            calls: [
                {
                    to: '0x96e44D241D3A6B069C3DF4e69DE28Ea098805b18',
                    value: '0x0',
                    data: '0xd09de08a',
                },
            ],
            capabilities: {},
        },
    ],
})

await provider.request({
    method: 'wallet_getCallsStatus',
    params: [id],
})

await provider.request({
    method: 'wallet_showCallsStatus',
    params: [id],
})
```


## Credits
This SDK is heavily based on the [Coinbase Wallet SDK](https://github.com/coinbase/coinbase-wallet-sdk).  
Many parts of the code are adapted or modified from the original Coinbase Wallet SDK repository.  
We thank the Coinbase Wallet SDK team for their excellent work and open source contributions.