import { create } from 'zustand'

interface WalletState {
  address: string | null
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => void
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  isConnected: false,
  connect: async () => {
    try {
      const freighter = await import('@stellar/freighter-api')
      const { address } = await freighter.getPublicKey()
      if (address) {
        set({ address, isConnected: true })
      }
    } catch (err) {
      console.error('Failed to connect wallet:', err)
    }
  },
  disconnect: () => {
    set({ address: null, isConnected: false })
  },
}))
