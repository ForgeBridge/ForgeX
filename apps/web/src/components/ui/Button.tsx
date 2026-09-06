'use client'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-medium rounded-md transition-colors transition-transform duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer'

  const variants = {
    primary:
      'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active',
    secondary:
      'bg-secondary text-secondary-foreground border border-border hover:bg-accent',
    ghost: 'text-muted-foreground hover:text-foreground hover:bg-muted',
    danger:
      'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80',
  }

  const sizes = {
    sm: 'h-8 px-3 text-xs min-h-[32px] [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:px-4',
    md: 'h-9 px-4 text-sm min-h-[36px] [@media(pointer:coarse)]:min-h-[44px]',
    lg: 'h-11 px-6 text-sm min-h-[44px]',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
