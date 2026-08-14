'use client'

import { motion } from 'framer-motion'
import { TokenFeed } from '../../components/tokens/TokenFeed'

export default function ExplorePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Explore Tokens</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Discover and trade bonding curve tokens on Stellar
          </p>
        </div>

        <TokenFeed pageSize={12} />
      </motion.div>
    </div>
  )
}
