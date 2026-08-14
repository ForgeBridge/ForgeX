'use client'

import { motion } from 'framer-motion'
import { CreateTokenForm } from '../../components/tokens/CreateTokenForm'

export default function CreateTokenPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Create Token</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Launch a bonding curve token on Stellar in minutes.
          </p>
        </div>

        <CreateTokenForm />
      </motion.div>
    </div>
  )
}
