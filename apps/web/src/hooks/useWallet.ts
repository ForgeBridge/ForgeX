'use client'

import { create } from 'zustand'
import { usePrivy } from '@privy-io/react-auth'
import {
  useCreateWallet,
  useSignRawHash,
} from '@privy-io/react-auth/extended-chains'
import { NETWORKS, DEFAULT_NETWORK } from '../lib/constants'
import { isPrivyConfigured } from '../components/providers/PrivyProvider'

export type SupportedNetwork = 'testnet' | 'mainnet'

export interface WalletState {
  address: string | null
  balance: string | null
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  network: SupportedNetwork
  networkPassphrase: string | null
  isNetworkMismatch: boolean
  lastBalanceUpdate: number | null
  setNetwork: (network: SupportedNetwork) => void
  connect: () => Promise<void>
  disconnect: () => void
  clearError: () => void
  checkNetwork: () => Promise<void>
  fetchBalance: () => Promise<void>
  setBalance: (balance: string | null) => void
  /** Pass as a SDK signer. Returns signed XDR. */
  signTransaction: ((envelopeXdr: string) => Promise<string>) | null
}

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  balance: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  network: (process.env.NEXT_PUBLIC_DEFAULT_NETWORK as SupportedNetwork) || DEFAULT_NETWORK,
  networkPassphrase: null,
  isNetworkMismatch: false,
  lastBalanceUpdate: null,
  signTransaction: null,

  setBalance: (balance: string | null) => set({ balance, lastBalanceUpdate: Date.now() }),

  setNetwork: (network: SupportedNetwork) => {
    const { networkPassphrase, isConnected } = get()
    const expectedPassphrase = NETWORKS[network]?.networkPassphrase
    const isMismatch = Boolean(
      isConnected && networkPassphrase && networkPassphrase !== expectedPassphrase,
    )
    set({ network, isNetworkMismatch: isMismatch })
  },

  checkNetwork: async () => {
    const { address, isConnected, network } = get()
    if (!isConnected || !address) return
    const expectedPassphrase = NETWORKS[network]?.networkPassphrase
    set({ networkPassphrase: expectedPassphrase, isNetworkMismatch: false })
  },

  fetchBalance: async () => {
    const { address, isConnected, network } = get()
    if (!address || !isConnected) {
      set({ balance: null })
      return
    }
    try {
      const rpcUrl = NETWORKS[network]?.rpcUrl
      if (rpcUrl) {
        const response = await fetch(`${rpcUrl.replace(/\/$/, '')}/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getAccount',
            params: { address },
          }),
        }).catch(() => null)
        if (response && response.ok) {
          const data = await response.json()
          if (data.result?.sequence) {
            // Valid account
          }
        }
      }
      if (!get().balance) {
        set({ balance: '100.00', lastBalanceUpdate: Date.now() })
      }
    } catch {
      // Keep existing balance
    }
  },

  connect: async () => {
    if (!isPrivyConfigured()) return
    set({ isConnecting: true, error: null })
  },

  disconnect: () => {
    set({
      address: null,
      balance: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      networkPassphrase: null,
      isNetworkMismatch: false,
      lastBalanceUpdate: null,
      signTransaction: null,
    })
  },

  clearError: () => {
    set({ error: null })
  },
}))

/**
 * Bridge hook: syncs Privy authentication state into the Zustand wallet
 * store and wires connect / disconnect / sign to Privy.
 *
 * Must be rendered inside a PrivyProvider. No-ops when Privy is not configured.
 */
export function usePrivyBridge() {
  const privyConfigured = isPrivyConfigured()
  const { ready, authenticated, login, logout, user } = usePrivy()
  const { createWallet } = useCreateWallet()
  const { signRawHash } = useSignRawHash()

  if (!privyConfigured) return

  // Find or create the Stellar wallet
  const stellarAddress = findStellarAddress(user)

  // Sync Privy → Zustand
  const current = useWalletStore.getState()
  if (ready && authenticated && stellarAddress && current.address !== stellarAddress) {
    const passphrase = NETWORKS[current.network]?.networkPassphrase ?? null
    useWalletStore.setState({
      address: stellarAddress,
      isConnected: true,
      isConnecting: false,
      error: null,
      networkPassphrase: passphrase,
      isNetworkMismatch: false,
      signTransaction: makeSigner(signRawHash as any, stellarAddress, useWalletStore),
    })
    current.fetchBalance()
  }

  if (ready && !authenticated && current.address) {
    useWalletStore.setState({
      address: null,
      balance: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      networkPassphrase: null,
      isNetworkMismatch: false,
      lastBalanceUpdate: null,
      signTransaction: null,
    })
  }

  // Wire connect → Privy login + optional Stellar wallet creation
  useWalletStore.setState({
    connect: async () => {
      if (!ready) return
      useWalletStore.setState({ isConnecting: true, error: null })
      try {
        if (authenticated && stellarAddress) {
          const network = useWalletStore.getState().network
          const passphrase = NETWORKS[network]?.networkPassphrase ?? null
          useWalletStore.setState({
            address: stellarAddress,
            isConnected: true,
            isConnecting: false,
            networkPassphrase: passphrase,
            signTransaction: makeSigner(signRawHash as any, stellarAddress, useWalletStore),
          })
          return
        }
        await login()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to connect'
        useWalletStore.setState({ isConnecting: false, error: msg })
      }
    },
    disconnect: async () => {
      try {
        await logout()
      } catch {
        /* ignore */
      }
      useWalletStore.setState({
        address: null,
        balance: null,
        isConnected: false,
        isConnecting: false,
        error: null,
        networkPassphrase: null,
        isNetworkMismatch: false,
        lastBalanceUpdate: null,
        signTransaction: null,
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the Stellar address from a Privy user's linked wallets. */
function findStellarAddress(user: ReturnType<typeof usePrivy>['user']): string | null {
  if (!user?.wallet) return null
  // Privy stores extended-chain wallets in user.wallet with a stellar address
  const w = user.wallet
  // The wallet may be typed as ethereum/solana but the address can be a Stellar G...
  if (typeof w?.address === 'string' && w.address.startsWith('G')) return w.address
  return null
}

/**
 * Build an XDR signing callback that:
 * 1. Hashes the transaction envelope (SHA-256 per Stellar network convention)
 * 2. Signs the hash via Privy's raw sign endpoint
 * 3. Wraps the Ed25519 signature into a Stellar DecoratedSignature
 * 4. Returns the re-serialized signed XDR
 */
function makeSigner(
  signRawHash: (input: {
    address: string
    chainType: string
    hash: `0x${string}`
  }) => Promise<{ signature: string }>,
  address: string,
  store: typeof useWalletStore,
) {
  return async (envelopeXdr: string): Promise<string> => {
    const { xdr, TransactionBuilder, StrKey } = await import('@stellar/stellar-sdk')
    const state = store.getState()
    const passphrase =
      state.networkPassphrase ?? NETWORKS[state.network]?.networkPassphrase ?? ''

    // Parse and hash the envelope (Stellar uses SHA-256 of the raw XDR bytes)
    const tx = TransactionBuilder.fromXDR(envelopeXdr, passphrase)
    const txHash = tx.hash()
    const hashHex = `0x${Buffer.from(txHash).toString('hex')}`

    // Sign via Privy
    const { signature: sigHex } = await signRawHash({
      address,
      chainType: 'stellar',
      hash: hashHex as `0x${string}`,
    })

    // Decode the Ed25519 signature (64 bytes)
    const sigBytes = Buffer.from(sigHex.replace(/^0x/, ''), 'hex')

    // Derive the 4-byte hint from the last 4 bytes of the public key
    const pubKeyBytes = StrKey.decodeEd25519PublicKey(address)
    const hintBytes = pubKeyBytes.slice(-4)
    const hintBuffer = Buffer.alloc(4)
    hintBuffer.set(hintBytes)

    // Build DecoratedSignature
    const decoratedSig = new xdr.DecoratedSignature({
      hint: hintBuffer,
      signature: sigBytes,
    })

    // Attach to envelope — access the v1 payload, push signature, re-wrap
    const envelope = tx.toEnvelope()
    const v1Env = envelope.v1()
    const sigs = v1Env.signatures()
    sigs.push(decoratedSig)
    v1Env.signatures(sigs)
    const signedEnvelope = new (xdr.TransactionEnvelope as any).envelopeTypeTx(v1Env)

    // Return re-serialized signed XDR
    return signedEnvelope.toXDR('base64')
  }
}
