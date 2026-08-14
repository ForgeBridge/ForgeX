'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { TokenFeed } from '../components/tokens/TokenFeed'
import { Button } from '../components/ui/Button'

const stats = [
  { label: 'Total Tokens Launched', value: '1,247' },
  { label: 'Total Volume', value: '2.4M XLM' },
  { label: 'Active Trading Pairs', value: '892' },
  { label: 'Total Participants', value: '14.2K' },
]

const features = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Zero Liquidity Fair Launch',
    description: 'No upfront capital required. Tokens launch on bonding curves, ensuring fair price discovery from the first trade.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: 'Soroban Smart Contracts',
    description: 'Built on Stellar Soroban for fast, low-cost transactions with enterprise-grade security and composability.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
      </svg>
    ),
    title: 'Real-Time Bonding Curves',
    description: 'Transparent, algorithmic pricing that adjusts instantly with every buy and sell. No hidden mechanics.',
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-subtle" />
              Live on Stellar Testnet
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
              Zero-liquidity{' '}
              <span className="text-primary">fair launches</span>{' '}
              on Stellar
            </h1>

            <p className="mt-5 text-lg text-muted-foreground max-w-xl leading-relaxed">
              Launch and trade tokens with bonding curve mechanics on Soroban.
              No upfront liquidity required. Every token starts from zero.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/explore">
                <Button size="lg">Explore Tokens</Button>
              </Link>
              <Link href="/create">
                <Button variant="secondary" size="lg">Create Token</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={item}
                className="py-6 px-4 sm:px-8 first:pl-0 last:pr-0"
              >
                <div className="text-2xl sm:text-3xl font-bold text-foreground font-mono tracking-tight">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
            className="grid md:grid-cols-3 gap-8"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={item}>
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded-md bg-muted border border-border flex items-center justify-center text-muted-foreground">
                    {feature.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Trending Tokens Section */}
      <section className="py-16 sm:py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Trending Tokens</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Most active tokens on the bonding curve
              </p>
            </div>
            <Link href="/explore" className="text-sm text-primary hover:underline font-medium">
              View all
            </Link>
          </div>

          <TokenFeed pageSize={6} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-xl mx-auto"
          >
            <h2 className="text-2xl font-bold text-foreground">
              Ready to launch your token?
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Create a bonding curve token on Stellar in under a minute. No
              coding required.
            </p>
            <div className="mt-6">
              <Link href="/create">
                <Button size="lg">Get Started</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
