# SAManager SDK

- Demo: https://johnson86tw.github.io/dapp5792/
- Example Code: https://github.com/johnson86tw/dapp5792/blob/main/src/App.vue
- Standards:
  - https://eip6963.org Multi Injected Provider Discovery
  - https://eip5792.xyz Wallet Call API
  - https://erc7677.xyz Paymaster Web Service Capability

## Usage

1. Install the library
```
npm install @samanager/sdk
```

2. Create the wallet provider

```ts
import { announceSAManagerProvider, SAManagerProvider } from '@samanager/sdk'
// announce EIP-6963 provider
announceSAManagerProvider({
    origin: "https://testnet.samanager.xyz", // optional; default is https://samanager.xyz
    debug: true, // optional; will print console.log
})

// or use the provider directly
const provider = new SAManagerProvider({
    origin: 'https://testnet.samanager.xyz',
})
```

3. RPC Methods

```ts
await provider.request({
    method: 'eth_requestAccounts',
    params: [],
})

await provider.request({
    method: 'eth_chainId',
    params: [],
})

await provider.request({
    method: 'eth_getBlockByNumber',
    params: ['latest', false],
})

await provider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId }],
})

// EIP-5792 & ERC-7677

await provider.request({
    method: 'wallet_getCapabilities',
    params: [from, [chainId]], // the second parameter (chainId) is optional
})

const callIdentifier = await provider.request({
    method: 'wallet_sendCalls',
    params: [
        {
            version: '2.0',
            chainId,
            from,
            atomicRequired: true,
            calls: [
                {
                    to: '0x96e44D241D3A6B069C3DF4e69DE28Ea098805b18',
                    value: '0x0',
                    data: '0xd09de08a',
                },
            ],
            capabilities: {
                paymasterService: {
                    url: "",
                    context: {
                        name: "",
                        icon: "",
                        sponsorshipPolicyId: ""
                    },
                },
            },
        },
    ],
})

await provider.request({
    method: 'wallet_getCallsStatus',
    params: [callIdentifier],
})

await provider.request({
    method: 'wallet_showCallsStatus',
    params: [callIdentifier],
})
```


## Credits
This SDK is heavily based on the [Coinbase Wallet SDK](https://github.com/coinbase/coinbase-wallet-sdk).  
Many parts of the code are adapted or modified from the original Coinbase Wallet SDK repository.  
We thank the Coinbase Wallet SDK team for their excellent work and open source contributions.