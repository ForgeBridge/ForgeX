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
      <body className="min-h-screen bg-[#0f172a] text-[#f1f5f9] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <h1 className="text-3xl font-bold text-[#f1f5f9]">Application Error</h1>
          <p className="text-[#94a3b8] text-sm">
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
