'use client'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-[var(--forgex-text-muted)]">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 rounded-lg bg-[var(--forgex-bg)] border ${
          error ? 'border-red-500' : 'border-[var(--forgex-border)]'
        } text-[var(--forgex-text)] placeholder-[var(--forgex-text-muted)] focus:outline-none focus:border-[var(--forgex-primary)] ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
