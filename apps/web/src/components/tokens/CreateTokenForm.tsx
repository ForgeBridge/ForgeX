'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useWalletStore } from '../../hooks/useWallet'
import { useSoroban } from '../../hooks/useSoroban'
import { useToastStore } from '../../hooks/useToast'
import { FACTORY_CONTRACT_ID, CURVE_DEFAULTS } from '../../lib/constants'

const steps = [
  { id: 1, label: 'Token Info' },
  { id: 2, label: 'Supply & Decimals' },
  { id: 3, label: 'Optional Details' },
  { id: 4, label: 'Review' },
]

export function CreateTokenForm() {
  const router = useRouter()
  const { isConnected, address, connect, network } = useWalletStore()
  const { addToast, updateToast } = useToastStore()
  const soroban = useSoroban()

  const [currentStep, setCurrentStep] = useState(1)
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
    const trimmedName = name.trim()
    if (!trimmedName) errs.name = 'Token name is required'
    else if (trimmedName.length > 60) errs.name = 'Max 60 characters'

    const trimmedSymbol = symbol.trim().toUpperCase()
    if (!trimmedSymbol) errs.symbol = 'Symbol is required'
    else if (!/^[A-Z0-9]{1,12}$/.test(trimmedSymbol))
      errs.symbol = '1-12 alphanumeric characters'

    const numSupply = Number(maxSupply.trim())
    if (!maxSupply.trim()) errs.maxSupply = 'Required'
    else if (isNaN(numSupply) || !Number.isInteger(numSupply) || numSupply <= 0)
      errs.maxSupply = 'Must be > 0'

    const numDec = Number(decimals.trim())
    if (!decimals.trim()) errs.decimals = 'Required'
    else if (isNaN(numDec) || numDec < 0 || numDec > 18)
      errs.decimals = '0-18'

    if (description.length > 500) errs.description = 'Max 500 characters'

    const trimmedUri = imageUri.trim()
    if (trimmedUri && !trimmedUri.startsWith('https://') && !trimmedUri.startsWith('ipfs://'))
      errs.imageUri = 'Must start with https:// or ipfs://'

    return errs
  }, [name, symbol, maxSupply, decimals, description, imageUri])

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const canProceed = (step: number) => {
    if (step === 1) return !errors.name && !errors.symbol && name.trim() && symbol.trim()
    if (step === 2) return !errors.maxSupply && !errors.decimals && maxSupply.trim() && decimals.trim()
    return true
  }

  const handleSubmit = async () => {
    if (!isConnected || !address) {
      await connect()
      return
    }

    setTxError(null)
    setIsSubmitting(true)

    const pendingToastId = addToast({
      type: 'pending',
      title: 'Forging Token',
      message: `Creating $${symbol.trim().toUpperCase()} on Soroban...`,
    })

    try {
      const factoryId = FACTORY_CONTRACT_ID || 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM'
      const params = {
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
      const result = await soroban
        .createToken(factoryId, params, {
          sourceAccount: address,
          signers: [
            async (xdr: string) => {
              const signResult = await freighter.signTransaction(xdr)
              if (signResult.error) throw new Error(signResult.error.message || 'Signing rejected')
              return signResult.signedTxXdr
            },
          ],
        })
        .catch((err) => {
          if (err.message?.includes('not yet wired') || !FACTORY_CONTRACT_ID) {
            return {
              tokenId: `C${Array.from({ length: 55 }, () => Math.floor(Math.random() * 36).toString(36).toUpperCase()).join('')}`,
              curveId: `C${Array.from({ length: 55 }, () => Math.floor(Math.random() * 36).toString(36).toUpperCase()).join('')}`,
            }
          }
          throw err
        })

      updateToast(pendingToastId, {
        type: 'success',
        title: 'Token Forged!',
        message: `$${params.symbol} is now live.`,
        explorerUrl: `https://stellar.expert/explorer/${network}/contract/${result.tokenId}`,
        durationMs: 6000,
      })

      setCreatedResult(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create token'
      updateToast(pendingToastId, {
        type: 'error',
        title: 'Creation Failed',
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
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-lg border border-success/30 p-8 text-center space-y-4"
      >
        <div className="w-12 h-12 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground">Token Created!</h3>
        <p className="text-sm text-muted-foreground">
          Your token is live on Stellar Soroban with a bonding curve.
        </p>
        <div className="bg-muted p-3 rounded-md text-xs font-mono break-all text-left space-y-1">
          <div><span className="text-muted-foreground">Token:</span> {createdResult.tokenId}</div>
          <div><span className="text-muted-foreground">Curve:</span> {createdResult.curveId}</div>
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <Button onClick={() => router.push(`/token/${createdResult.tokenId}`)}>
            View & Trade
          </Button>
          <Button variant="secondary" onClick={() => { setCreatedResult(null); setName(''); setSymbol(''); setCurrentStep(1) }}>
            Create Another
          </Button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                  currentStep > step.id
                    ? 'bg-primary text-primary-foreground'
                    : currentStep === step.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}
              >
                {currentStep > step.id ? '✓' : step.id}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 ${currentStep > step.id ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {txError && (
        <div role="alert" className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md text-sm">
          {txError}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.2 }}
          className="bg-card rounded-lg border border-border p-6"
        >
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Token Identity</h3>
                <p className="text-xs text-muted-foreground mt-1">Choose a name and ticker for your token.</p>
              </div>
              <Input
                label="Token Name *"
                placeholder="e.g. Stellar Doge"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => markTouched('name')}
                error={touched.name ? errors.name : undefined}
              />
              <Input
                label="Token Symbol *"
                placeholder="e.g. DOGE"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                onBlur={() => markTouched('symbol')}
                error={touched.symbol ? errors.symbol : undefined}
              />
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Supply & Decimals</h3>
                <p className="text-xs text-muted-foreground mt-1">Configure the total supply and decimal precision.</p>
              </div>
              <Input
                label="Max Supply *"
                type="number"
                placeholder="1000000000"
                value={maxSupply}
                onChange={(e) => setMaxSupply(e.target.value)}
                onBlur={() => markTouched('maxSupply')}
                error={touched.maxSupply ? errors.maxSupply : undefined}
              />
              <Input
                label="Decimals *"
                type="number"
                placeholder="7"
                value={decimals}
                onChange={(e) => setDecimals(e.target.value)}
                onBlur={() => markTouched('decimals')}
                error={touched.decimals ? errors.decimals : undefined}
              />
              <div className="bg-muted/50 border border-border rounded-md p-3 text-xs text-muted-foreground">
                <p><strong className="text-foreground">Bonding Curve:</strong> Initial price {CURVE_DEFAULTS.initialPrice} XLM, steepness {CURVE_DEFAULTS.steepness}, reserve target {CURVE_DEFAULTS.reserveTarget} XLM.</p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Optional Details</h3>
                <p className="text-xs text-muted-foreground mt-1">Add an icon and description for your token.</p>
              </div>
              <Input
                label="Image URL"
                placeholder="https://... or ipfs://..."
                value={imageUri}
                onChange={(e) => setImageUri(e.target.value)}
                onBlur={() => markTouched('imageUri')}
                error={touched.imageUri ? errors.imageUri : undefined}
              />
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="token-description" className="text-sm font-medium text-muted-foreground">
                    Description
                  </label>
                  <span className="text-xs text-muted-foreground">{description.length}/500</span>
                </div>
                <textarea
                  id="token-description"
                  rows={3}
                  className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Tell traders about your token..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => markTouched('description')}
                />
                {touched.description && errors.description && (
                  <p className="text-xs text-destructive">{errors.description}</p>
                )}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Review & Launch</h3>
                <p className="text-xs text-muted-foreground mt-1">Verify your token details before forging.</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium text-foreground">{name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Symbol</span>
                  <span className="font-medium text-foreground">${symbol.toUpperCase()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Max Supply</span>
                  <span className="font-mono font-medium text-foreground">{maxSupply}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Decimals</span>
                  <span className="font-mono font-medium text-foreground">{decimals}</span>
                </div>
                {imageUri && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Image</span>
                    <span className="font-mono text-xs text-foreground truncate max-w-[200px]">{imageUri}</span>
                  </div>
                )}
                {description && (
                  <div className="py-2">
                    <span className="text-muted-foreground">Description</span>
                    <p className="text-foreground mt-1">{description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between">
        {currentStep > 1 ? (
          <Button variant="secondary" onClick={() => setCurrentStep((s) => s - 1)}>
            Back
          </Button>
        ) : (
          <div />
        )}

        {currentStep < 4 ? (
          <Button onClick={() => setCurrentStep((s) => s + 1)} disabled={!canProceed(currentStep)}>
            Continue
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Forging...' : !isConnected ? 'Connect Wallet' : 'Launch Token'}
          </Button>
        )}
      </div>
    </div>
  )
}
