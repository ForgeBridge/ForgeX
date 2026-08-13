# Frontend Theming & Design Tokens

## Overview

ForgeX uses a **CSS custom property (variable) based theming system** with Tailwind CSS for utility classes. All colors, spacing, typography, and shadows are defined as design tokens in `globals.css`.

---

## Color System

### Semantic Colors (CSS Variables)

```css
:root {
  /* Brand */
  --forgex-primary: 142 76% 36%;        /* Emerald-600 */
  --forgex-primary-hover: 142 76% 30%;  /* Emerald-700 */
  --forgex-primary-light: 142 76% 45%;  /* Emerald-500 */

  /* Surface */
  --forgex-surface: 0 0% 100%;           /* White */
  --forgex-surface-elevated: 0 0% 98%;   /* Gray-50 */
  --forgex-surface-border: 0 0% 90%;     /* Gray-200 */

  /* Text */
  --forgex-text: 222 47% 11%;            /* Gray-900 */
  --forgex-text-muted: 215 16% 47%;      /* Gray-500 */
  --forgex-text-inverse: 0 0% 100%;      /* White */

  /* State */
  --forgex-success: 142 76% 36%;         /* Emerald-600 */
  --forgex-warning: 38 92% 50%;          /* Amber-500 */
  --forgex-error: 0 84% 60%;             /* Red-500 */
  --forgex-info: 199 89% 48%;            /* Sky-500 */

  /* Border */
  --forgex-border: 214 32% 91%;          /* Gray-200 */
  --forgex-border-focus: 142 76% 36%;    /* Primary */

  /* Shadow */
  --forgex-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --forgex-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --forgex-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --forgex-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}
```

### Dark Mode

```css
@media (prefers-color-scheme: dark) {
  :root {
    --forgex-surface: 222 47% 8%;           /* Gray-950 */
    --forgex-surface-elevated: 222 47% 10%; /* Gray-900 */
    --forgex-surface-border: 217 33% 17%;   /* Gray-800 */

    --forgex-text: 210 40% 98%;             /* Gray-50 */
    --forgex-text-muted: 215 20% 65%;       /* Gray-400 */
    --forgex-text-inverse: 222 47% 8%;      /* Gray-950 */

    --forgex-border: 217 33% 17%;           /* Gray-800 */
    --forgex-border-focus: 142 76% 45%;     /* Primary-light */
  }
}
```

### Usage in Components

```tsx
// Using CSS variables directly
<div className="bg-[var(--forgex-surface)] text-[var(--forgex-text)] border border-[var(--forgex-border)]">

// Using Tailwind with custom config (see tailwind.config.ts)
<div className="bg-forgex-surface text-forgex-text border-forgex-border">
```

---

## Tailwind Configuration

### `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantic color mapping
        forgex: {
          primary: 'hsl(var(--forgex-primary))',
          'primary-hover': 'hsl(var(--forgex-primary-hover))',
          'primary-light': 'hsl(var(--forgex-primary-light))',
          surface: 'hsl(var(--forgex-surface))',
          'surface-elevated': 'hsl(var(--forgex-surface-elevated))',
          'surface-border': 'hsl(var(--forgex-surface-border))',
          text: 'hsl(var(--forgex-text))',
          'text-muted': 'hsl(var(--forgex-text-muted))',
          'text-inverse': 'hsl(var(--forgex-text-inverse))',
          success: 'hsl(var(--forgex-success))',
          warning: 'hsl(var(--forgex-warning))',
          error: 'hsl(var(--forgex-error))',
          info: 'hsl(var(--forgex-info))',
          border: 'hsl(var(--forgex-border))',
          'border-focus': 'hsl(var(--forgex-border-focus))',
        },
      },
      boxShadow: {
        'forgex-sm': 'var(--forgex-shadow-sm)',
        forgex: 'var(--forgex-shadow)',
        'forgex-md': 'var(--forgex-shadow-md)',
        'forgex-lg': 'var(--forgex-shadow-lg)',
      },
      borderRadius: {
        'forgex': '0.5rem',      /* 8px */
        'forgex-lg': '0.75rem',  /* 12px */
        'forgex-xl': '1rem',     /* 16px */
      },
      transitionDuration: {
        'forgex': '150ms',
        'forgex-slow': '300ms',
      },
      transitionTimingFunction: {
        'forgex': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
```

### Usage Examples

```tsx
// Buttons
<button className="bg-forgex-primary text-forgex-text-inverse hover:bg-forgex-primary-hover px-4 py-2 rounded-forgex transition-forgex">
  Primary
</button>

<button className="border-forgex-border text-forgex-text hover:bg-forgex-surface-elevated px-4 py-2 rounded-forgex transition-forgex">
  Secondary
</button>

// Cards
<div className="bg-forgex-surface border-forgex-border rounded-forgex-lg shadow-forgex p-4">

// Inputs
<input className="w-full rounded-forgex border-forgex-border px-3 py-2 focus:border-forgex-border-focus focus:ring-2 focus:ring-forgex-primary/20 focus:outline-none" />

// Text
<h1 className="text-forgex-text">Heading</h1>
<p className="text-forgex-text-muted">Muted text</p>
<code className="font-mono text-forgex-primary">Code</code>
```

---

## Spacing Scale

```css
:root {
  --forgex-space-1: 0.25rem;   /* 4px */
  --forgex-space-2: 0.5rem;    /* 8px */
  --forgex-space-3: 0.75rem;   /* 12px */
  --forgex-space-4: 1rem;      /* 16px */
  --forgex-space-5: 1.25rem;   /* 20px */
  --forgex-space-6: 1.5rem;    /* 24px */
  --forgex-space-8: 2rem;      /* 32px */
  --forgex-space-10: 2.5rem;   /* 40px */
  --forgex-space-12: 3rem;     /* 48px */
  --forgex-space-16: 4rem;     /* 64px */
}
```

---

## Typography

```css
:root {
  /* Font families */
  --font-inter: 'Inter', system-ui, sans-serif;
  --font-jetbrains-mono: 'JetBrains Mono', monospace;

  /* Font sizes */
  --forgex-text-xs: 0.75rem;    /* 12px */
  --forgex-text-sm: 0.875rem;   /* 14px */
  --forgex-text-base: 1rem;     /* 16px */
  --forgex-text-lg: 1.125rem;   /* 18px */
  --forgex-text-xl: 1.25rem;    /* 20px */
  --forgex-text-2xl: 1.5rem;    /* 24px */
  --forgex-text-3xl: 1.875rem;  /* 30px */
  --forgex-text-4xl: 2.25rem;   /* 36px */

  /* Line heights */
  --forgex-leading-tight: 1.25;
  --forgex-leading-normal: 1.5;
  --forgex-leading-relaxed: 1.75;

  /* Font weights */
  --forgex-font-normal: 400;
  --forgex-font-medium: 500;
  --forgex-font-semibold: 600;
  --forgex-font-bold: 700;
}
```

### Tailwind Typography Mapping

```typescript
// In tailwind.config.ts
fontSize: {
  'forgex-xs': ['var(--forgex-text-xs)', { lineHeight: 'var(--forgex-leading-normal)' }],
  'forgex-sm': ['var(--forgex-text-sm)', { lineHeight: 'var(--forgex-leading-normal)' }],
  'forgex-base': ['var(--forgex-text-base)', { lineHeight: 'var(--forgex-leading-relaxed)' }],
  'forgex-lg': ['var(--forgex-text-lg)', { lineHeight: 'var(--forgex-leading-relaxed)' }],
  'forgex-xl': ['var(--forgex-text-xl)', { lineHeight: 'var(--forgex-leading-tight)' }],
  'forgex-2xl': ['var(--forgex-text-2xl)', { lineHeight: 'var(--forgex-leading-tight)' }],
  'forgex-3xl': ['var(--forgex-text-3xl)', { lineHeight: 'var(--forgex-leading-tight)' }],
  'forgex-4xl': ['var(--forgex-text-4xl)', { lineHeight: 'var(--forgex-leading-tight)' }],
}
```

---

## Component Patterns

### Button Variants

```tsx
// Primary
className="bg-forgex-primary text-forgex-text-inverse hover:bg-forgex-primary-hover px-4 py-2 rounded-forgex font-medium transition-forgex disabled:opacity-50 disabled:cursor-not-allowed"

// Secondary
className="border-forgex-border text-forgex-text hover:bg-forgex-surface-elevated px-4 py-2 rounded-forgex font-medium transition-forgex"

// Ghost
className="text-forgex-text hover:bg-forgex-surface-elevated px-4 py-2 rounded-forgex font-medium transition-forgex"

// Destructive
className="bg-forgex-error text-forgex-text-inverse hover:opacity-90 px-4 py-2 rounded-forgex font-medium transition-forgex"
```

### Input Fields

```tsx
// Standard
className="w-full rounded-forgex border-forgex-border bg-forgex-surface px-3 py-2 text-forgex-text placeholder-forgex-text-muted focus:border-forgex-border-focus focus:ring-2 focus:ring-forgex-primary/20 focus:outline-none transition-forgex"

// Error state
className="border-forgex-error focus:border-forgex-error focus:ring-forgex-error/20"
```

### Cards

```tsx
// Default
className="bg-forgex-surface border-forgex-border rounded-forgex-lg shadow-forgex"

// Elevated
className="bg-forgex-surface-elevated border-forgex-border rounded-forgex-xl shadow-forgex-lg"

// Interactive
className="bg-forgex-surface border-forgex-border rounded-forgex-lg shadow-forgex hover:border-forgex-primary hover:shadow-forgex-md transition-forgex cursor-pointer"
```

### Modals/Dialogs

```tsx
// Overlay
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />

// Panel
<div className="bg-forgex-surface rounded-forgex-xl shadow-forgex-lg max-w-md w-full mx-4">
  <div className="p-4 border-b-forgex-border border-b">
    <h2 className="text-forgex-text text-forgex-xl font-semibold">Title</h2>
  </div>
  <div className="p-4">
    {/* Content */}
  </div>
  <div className="p-4 border-t-forgex-border border-t flex justify-end gap-2">
    <button className="border-forgex-border text-forgex-text hover:bg-forgex-surface-elevated px-4 py-2 rounded-forgex">
      Cancel
    </button>
    <button className="bg-forgex-primary text-forgex-text-inverse hover:bg-forgex-primary-hover px-4 py-2 rounded-forgex">
      Confirm
    </button>
  </div>
</div>
```

### Tables

```tsx
<table className="w-full text-sm">
  <thead>
    <tr className="border-b-forgex-border">
      <th className="text-left py-3 px-4 font-medium text-forgex-text-muted">Header</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b-forgex-border/50 hover:bg-forgex-surface-elevated">
      <td className="py-3 px-4 text-forgex-text">Cell</td>
    </tr>
  </tbody>
</table>
```

---

## Dark Mode Implementation

### Automatic (System Preference)

```css
/* In globals.css - already configured */
@media (prefers-color-scheme: dark) {
  :root {
    /* Dark mode overrides */
  }
}
```

### Manual Toggle (Future)

```tsx
// Theme context provider
const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  
  return <>{children}</>
}
```

---

## Adding New Tokens

### 1. Define in `globals.css`

```css
:root {
  --forgex-new-token: value;
}

@media (prefers-color-scheme: dark) {
  :root {
    --forgex-new-token: dark-value;
  }
}
```

### 2. Map in `tailwind.config.ts`

```typescript
theme: {
  extend: {
    colors: {
      forgex: {
        'new-token': 'hsl(var(--forgex-new-token))',
      },
    },
  },
}
```

### 3. Use in Components

```tsx
<div className="bg-forgex-new-token text-forgex-text-inverse">
```

---

## Design Token Reference Table

| Token | Light Value | Dark Value | Usage |
|-------|-------------|------------|-------|
| `--forgex-primary` | `142 76% 36%` | `142 76% 45%` | Primary actions, links |
| `--forgex-surface` | `0 0% 100%` | `222 47% 8%` | Card backgrounds, page bg |
| `--forgex-surface-elevated` | `0 0% 98%` | `222 47% 10%` | Modals, dropdowns |
| `--forgex-text` | `222 47% 11%` | `210 40% 98%` | Primary text |
| `--forgex-text-muted` | `215 16% 47%` | `215 20% 65%` | Secondary text |
| `--forgex-border` | `214 32% 91%` | `217 33% 17%` | Dividers, input borders |
| `--forgex-success` | `142 76% 36%` | `142 76% 45%` | Success states |
| `--forgex-warning` | `38 92% 50%` | `38 92% 55%` | Warning states |
| `--forgex-error` | `0 84% 60%` | `0 84% 65%` | Error states |
| `--forgex-info` | `199 89% 48%` | `199 89% 53%` | Info states |

---

## Accessibility

- **Contrast ratios**: All text meets WCAG AA (4.5:1) in both themes
- **Focus indicators**: Visible ring using `--forgex-border-focus`
- **Color independence**: Status conveyed via icons + text, not color alone
- **Reduced motion**: Respects `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Migration Guide

### From Hardcoded Colors

```tsx
// Before
<div className="bg-emerald-600 text-white border-gray-200">

// After
<div className="bg-forgex-primary text-forgex-text-inverse border-forgex-border">
```

### From Inline Styles

```tsx
// Before
<div style={{ backgroundColor: '#059669', color: 'white' }}>

// After
<div className="bg-forgex-primary text-forgex-text-inverse">
```

---

## Resources

- [Tailwind CSS Custom Properties](https://tailwindcss.com/docs/adding-custom-styles#using-css-variables)
- [WCAG Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)