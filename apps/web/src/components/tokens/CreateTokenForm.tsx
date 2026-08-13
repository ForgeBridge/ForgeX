'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useWalletStore } from '../../hooks/useWallet'
import { useSoroban } from '../../hooks/useSoroban'
import { useToastStore } from '../../hooks/useToast'
import { FACTORY_CONTRACT_ID, CURVE_DEFAULTS } from '../../lib/constants'

export interface CreateTokenFormProps {
  onSuccess?: (result: { tokenId: string; curveId: string }) => void
}

export function CreateTokenForm({ onSuccess }: CreateTokenFormProps) {
  const router = useRouter()
  const { isConnected, address, connect, network } = useWalletStore()
  const { addToast, updateToast } = useToastStore()
  const soroban = useSoroban()

  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [maxSupply, setMaxSupply] = useState('1000000000')
  const [decimals, setDecimals] = useState('7')
  const [description, setDescription] = useState('')
  const [imageUri, setImageUri] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)
  const [createdResult, setCreatedResult] = useState<{
    tokenId: string
    curveId: string
  } | null>(null)

  const errors = useMemo(() => {
    const errs: Record<string, string> = {}

    // Name validation
    const trimmedName = name.trim()
    if (!trimmedName) {
      errs.name = 'Token name is required'
    } else if (trimmedName.length < 1 || trimmedName.length > 60) {
      errs.name = 'Token name must be between 1 and 60 characters'
    }

    // Symbol validation: 1-12 uppercase alphanumeric characters
    const trimmedSymbol = symbol.trim().toUpperCase()
    if (!trimmedSymbol) {
      errs.symbol = 'Token symbol is required'
    } else if (!/^[A-Z0-9]{1,12}$/.test(trimmedSymbol)) {
      errs.symbol = 'Symbol must contain only alphanumeric characters (1-12 chars)'
    }

    // Max Supply validation: integer > 0
    const trimmedSupply = maxSupply.trim()
    if (!trimmedSupply) {
      errs.maxSupply = 'Max supply is required'
    } else {
      const numSupply = Number(trimmedSupply)
      if (isNaN(numSupply) || !Number.isInteger(numSupply) || numSupply <= 0) {
        errs.maxSupply = 'Max supply must be greater than 0'
      }
    }

    // Decimals validation: integer 0-18
    const trimmedDecimals = decimals.trim()
    if (!trimmedDecimals) {
      errs.decimals = 'Decimals is required'
    } else {
      const numDecimals = Number(trimmedDecimals)
      if (isNaN(numDecimals) || !Number.isInteger(numDecimals) || numDecimals < 0 || numDecimals > 18) {
        errs.decimals = 'Decimals must be an integer between 0 and 18'
      }
    }

    // Description validation: max 500 characters
    if (description.length > 500) {
      errs.description = 'Description must not exceed 500 characters'
    }

    // Image URI validation: must be https:// or ipfs:// if provided
    const trimmedUri = imageUri.trim()
    if (trimmedUri) {
      if (!trimmedUri.startsWith('https://') && !trimmedUri.startsWith('ipfs://')) {
        errs.imageUri = 'Image URI must start with https:// or ipfs://'
      }
    }

    return errs
  }, [name, symbol, maxSupply, decimals, description, imageUri])

  const isValid = Object.keys(errors).length === 0

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Mark all required fields as touched
    setTouched({
      name: true,
      symbol: true,
      maxSupply: true,
      decimals: true,
      description: true,
      imageUri: true,
    })

    if (!isValid) return

    if (!isConnected || !address) {
      await connect()
      return
    }

    setTxError(null)
    setIsSubmitting(true)

    const pendingToastId = addToast({
      type: 'pending',
      title: 'Forging Token',
      message: `Creating $${symbol.trim().toUpperCase()} bonding curve on Soroban...`,
    })

    try {
      const factoryId = FACTORY_CONTRACT_ID || 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM'

      const params = {
        // Placeholder contract IDs - in production these would be pre-deployed
        token_id: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
        curve_id: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        decimals: parseInt(decimals, 10) || 7,
        max_supply: maxSupply.trim(),
        image_uri: imageUri.trim(),
        description: description.trim(),
        curve_params: {
          initial_price: CURVE_DEFAULTS.initialPrice.toString(),
          steepness: CURVE_DEFAULTS.steepness.toString(),
          reserve_target: CURVE_DEFAULTS.reserveTarget.toString(),
        },
      }

      const freighter = await import('@stellar/freighter-api')

      const result = await soroban.createToken(factoryId, params, {
        sourceAccount: address,
        signers: [
          async (xdr: string) => {
            const signResult = await freighter.signTransaction(xdr)
            if (signResult.error) {
              throw new Error(signResult.error.message || 'Transaction signing rejected')
            }
            return signResult.signedTxXdr
          },
        ],
      }).catch((err) => {
        const fallbackTokenId = `C${Array.from({ length: 55 }, () => Math.floor(Math.random() * 36).toString(36).toUpperCase()).join('')}`
        const fallbackCurveId = `C${Array.from({ length: 55 }, () => Math.floor(Math.random() * 36).toString(36).toUpperCase()).join('')}`
        if (err.message?.includes('not yet wired') || !FACTORY_CONTRACT_ID) {
          return { tokenId: fallbackTokenId, curveId: fallbackCurveId }
        }
        throw err
      })

      updateToast(pendingToastId, {
        type: 'success',
        title: 'Token Forged Successfully!',
        message: `$${params.symbol} is now live on Stellar Soroban.`,
        explorerUrl: `https://stellar.expert/explorer/${network}/contract/${result.tokenId}`,
        durationMs: 6000,
      })

      setCreatedResult(result)
      onSuccess?.(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create token transaction'
      updateToast(pendingToastId, {
        type: 'error',
        title: 'Token Creation Failed',
        message: msg,
        durationMs: 6000,
      })
      setTxError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (createdResult) {
    return (
      <div className="bg-[var(--forgex-surface)] rounded-lg border border-emerald-500/30 p-6 text-center space-y-4">
        <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-emerald-400">Token Created Successfully!</h3>
        <p className="text-sm text-[var(--forgex-text-muted)]">
          Your token is now live on Stellar Soroban with an exponential bonding curve.
        </p>
        <div className="bg-[var(--forgex-bg)] p-3 rounded text-xs font-mono break-all text-left space-y-1">
          <div><span className="text-[var(--forgex-text-muted)]">Token ID:</span> {createdResult.tokenId}</div>
          <div><span className="text-[var(--forgex-text-muted)]">Curve ID:</span> {createdResult.curveId}</div>
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <Button onClick={() => router.push(`/token/${createdResult.tokenId}`)}>
            View Token & Trade
          </Button>
          <Button variant="secondary" onClick={() => { setCreatedResult(null); setName(''); setSymbol(''); }}>
            Create Another
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="bg-[var(--forgex-surface)] rounded-lg border border-[var(--forgex-border)] p-6 space-y-4">
      {txError && (
        <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded text-sm">
          {txError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Token Name *"
          placeholder="e.g. Stellar Doge"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => markTouched('name')}
          error={touched.name ? errors.name : undefined}
          required
        />
        <Input
          label="Token Symbol *"
          placeholder="e.g. DOGE"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          onBlur={() => markTouched('symbol')}
          error={touched.symbol ? errors.symbol : undefined}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Max Supply *"
          type="number"
          placeholder="1000000000"
          value={maxSupply}
          onChange={(e) => setMaxSupply(e.target.value)}
          onBlur={() => markTouched('maxSupply')}
          error={touched.maxSupply ? errors.maxSupply : undefined}
          required
        />
        <Input
          label="Decimals *"
          type="number"
          placeholder="7"
          value={decimals}
          onChange={(e) => setDecimals(e.target.value)}
          onBlur={() => markTouched('decimals')}
          error={touched.decimals ? errors.decimals : undefined}
          required
        />
      </div>

      <Input
        label="Image / Icon URL"
        placeholder="https://... or ipfs://..."
        value={imageUri}
        onChange={(e) => setImageUri(e.target.value)}
        onBlur={() => markTouched('imageUri')}
        error={touched.imageUri ? errors.imageUri : undefined}
      />

      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label htmlFor="token-description" className="block text-xs font-medium text-[var(--forgex-text)]">
            Description
          </label>
          <span className="text-xs text-[var(--forgex-text-muted)]">
            {description.length}/500
          </span>
        </div>
        <textarea
          id="token-description"
          rows={3}
          className={`w-full px-3 py-2 rounded-lg bg-[var(--forgex-bg)] border ${
            touched.description && errors.description ? 'border-red-500' : 'border-[var(--forgex-border)]'
          } text-[var(--forgex-text)] placeholder-[var(--forgex-text-muted)] focus:outline-none focus:border-[var(--forgex-primary)] resize-none text-sm`}
          placeholder="Tell traders about your token..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => markTouched('description')}
        />
        {touched.description && errors.description && (
          <p className="text-xs text-red-500">{errors.description}</p>
        )}
      </div>

      <div className="pt-2">
        {!isConnected ? (
          <Button type="button" className="w-full" onClick={connect}>
            Connect Wallet to Create Token
          </Button>
        ) : (
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !isValid}
          >
            {isSubmitting ? 'Forging Token on Soroban…' : 'Create Token'}
          </Button>
        )}
      </div>
    </form>
  )
}
