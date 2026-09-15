# ForgeX Agent Guidelines

## Critical: Build Memory Constraints

The Pxxl build server has ~31GB RAM but the container has a hard memory limit.
The `next build` process must stay within this limit or deployment fails with OOM.

### Rules for adding dependencies

1. **Never add heavy packages (>100KB) as static imports in layout or shared components.**
   Use `next/dynamic` with `{ ssr: false }` for anything that pulls in crypto,
   animation, charting, or wallet libraries.

2. **Before adding a new dependency, check if a lighter alternative exists.**
   The current heavy deps are: `@privy-io/react-auth`, `@stellar/stellar-sdk`,
   `framer-motion`, `lightweight-charts`. Each one costs ~300-800KB.

3. **Never import `@stellar/stellar-sdk` at the top level of a shared hook.**
   Use `const { xdr, TransactionBuilder } = await import('@stellar/stellar-sdk')`
   inside the function that needs it. Native addons (sodium-native) allocate
   memory outside V8 heap and are not limited by `--max-old-space-size`.

4. **Dynamic-import any new component that appears in `layout.tsx`.**
   Every component in the layout tree gets bundled into every page.

5. **Run `npm run lint` separately, not during build.**
   ESLint adds significant memory overhead. It is skipped during build
   (`eslint.ignoreDuringBuilds: true` in next.config.js).

### Layout component policy

All layout components in `src/app/layout.tsx` MUST use `next/dynamic` with `{ ssr: false }`.
This prevents heavy client-only dependencies from being included in the server bundle.

```tsx
// CORRECT
const HeavyThing = dynamic(() => import('./HeavyThing').then(m => m.HeavyThing), { ssr: false })

// WRONG - will OOM
import { HeavyThing } from './HeavyThing'
```

### Before pushing, run locally

```bash
cd apps/web && npm run build
```

If the local build succeeds but the remote build fails, the container memory
limit is likely being exceeded. Reduce imports or add more dynamic boundaries.
