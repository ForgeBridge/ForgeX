import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import {
  mainnet,
  arbitrum,
  base,
  sepolia,
  type AppKitNetwork,
} from '@reown/appkit/networks'

/**
 * Reown AppKit (multi-chain wallet rail) configuration.
 *
 * Stellar stays on Freighter via `hooks/useWallet`. EVM chains go through
 * AppKit's modal (600+ wallets). This file is the single place to grow:
 *
 * - More EVM chains: import from `@reown/appkit/networks` and append to
 *   `evmNetworks` (must stay a non-empty tuple).
 * - Solana: `npm i @reown/appkit-adapter-solana`, add `new SolanaAdapter()`
 *   to the `adapters` array in `ReownProvider`, append solana networks.
 * - Stellar via WalletConnect protocol later: use `UniversalConnector`
 *   (`@reown/appkit-universal-connector`) with a custom CAIP network
 *   (`stellar:pubnet` / `stellar:testnet`) alongside the adapters here.
 *
 * Get a project ID at https://dashboard.reown.com and set
 * `NEXT_PUBLIC_REOWN_PROJECT_ID`. Without it the EVM option stays disabled
 * and the Stellar flow is unaffected.
 */

export const reownProjectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID

export const isReownConfigured = Boolean(reownProjectId)

export const evmNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet,
  arbitrum,
  base,
  sepolia,
]

export const evmDefaultNetwork = sepolia

export const reownMetadata = {
  name: 'ForgeX',
  description: 'Zero-liquidity fair launches on Stellar. Launch and trade bonding curve tokens.',
  url: 'https://forgex.pxxl.click',
  icons: ['https://forgex.pxxl.click/icon.svg'],
}

export const wagmiAdapter = isReownConfigured
  ? new WagmiAdapter({
      ssr: true,
      projectId: reownProjectId as string,
      networks: evmNetworks,
    })
  : null
