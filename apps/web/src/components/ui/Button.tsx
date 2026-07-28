'use client'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base = 'font-medium rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50'
  const variants = {
    primary: 'bg-[var(--forgex-primary)] text-white',
    secondary: 'bg-[var(--forgex-surface)] border border-[var(--forgex-border)] text-[var(--forgex-text)]',
    ghost: 'text-[var(--forgex-text-muted)] hover:text-[var(--forgex-text)]',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}
