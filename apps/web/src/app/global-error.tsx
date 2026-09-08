'use client'

import { Button } from '../components/ui/Button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 bg-card border border-border rounded-lg p-8">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">Application Error</h1>
          <p className="text-muted-foreground text-sm">
            {error.message || 'A critical error occurred. Please reload the application.'}
          </p>
          <div>
            <Button onClick={reset} size="md">
              Reload Application
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
