'use client'

import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export function SellForm() {
  const [amount, setAmount] = useState('')

  return (
    <div className="space-y-3">
      <Input
        label="Amount (Tokens)"
        type="number"
        placeholder="0.0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Button variant="secondary" className="w-full" onClick={() => alert('Sell coming soon')}>
        Sell
      </Button>
    </div>
  )
}
