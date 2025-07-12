# Smart Account Manager

SAManager is a general web wallet that aims to enable interoperability across different contract account implementations. 

By leveraging ERC-4337 and various account providers, it allows users to access their smart accounts using EOAs or Passkeys to authenticate their accounts.

Smart accounts shouldn't be locked into specific wallet providers. SAManager ensures your accounts remain accessible regardless of the interface you choose to use, promoting a more open and self-custodial experience.

## Dev notes

- [Backend repository](https://github.com/ethaccount/SAManager-backend)
- TypeScript library [sendop](https://github.com/ethaccount/sendop)


### Commands

```
pnpm dev
pnpm build
pnpm typecheck
```


[shadcn-vue](https://shadcn-vue.com/docs/components/button.html)


```
pnpm dlx shadcn-vue@2.1.0 add button
```

### Secrets on Workers

docs: https://developers.cloudflare.com/workers/configuration/secrets/

```
pnpm wrangler secret list
pnpm wrangler secret put <KEY>
```

### Reference

- token lists: https://github.com/Uniswap/token-lists
- USDC address: https://developers.circle.com/stablecoins/usdc-on-test-networks
- Icons: https://lucide.dev/icons/
- web3icons: https://tokenicons.io/
- Toast: https://vue-sonner.robertshaw.id/
- Modal: https://vue-final-modal.org/use-cases/playground
- eslint: https://github.com/vuejs/eslint-config-typescript/?tab=readme-ov-file#vueeslint-config-typescript

## Credits

- Favicon generated using [favicon.io](https://favicon.io/emoji-favicons/diamond-with-a-dot/)
- Emoji graphics licensed under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) from the [Twemoji project](https://github.com/twitter/twemoji)