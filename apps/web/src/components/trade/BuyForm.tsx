'use client'

import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export function BuyForm() {
  const [amount, setAmount] = useState('')

  return (
    <div className="space-y-3">
      <Input
        label="Amount (XLM)"
        type="number"
        placeholder="0.0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Button className="w-full" onClick={() => alert('Buy coming soon')}>
        Buy
      </Button>
    </div>
  )
}
