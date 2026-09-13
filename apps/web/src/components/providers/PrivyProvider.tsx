'use client'

import { PrivyProvider as Privy } from '@privy-io/react-auth'

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID

export function isPrivyConfigured(): boolean {
  return Boolean(privyAppId)
}

export function PrivyProvider({ children }: { children: React.ReactNode }) {
  if (!privyAppId) return <>{children}</>

  return (
    <Privy
      appId={privyAppId}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#2563eb',
        },
        loginMethods: ['email', 'google', 'github', 'wallet'],
      }}
    >
      {children}
    </Privy>
  )
}
