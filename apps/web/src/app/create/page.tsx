'use client'

import { CreateTokenForm } from '../../components/tokens/CreateTokenForm'

export default function CreateTokenPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Create Token</h1>
      <p className="text-[var(--forgex-text-muted)] mb-8">
        Launch your token on Stellar with zero upfront liquidity using our exponential bonding curve AMM.
      </p>
      <CreateTokenForm />
    </div>
  )
}
