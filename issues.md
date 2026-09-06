# ForgeX — Audit Fix List

Source: `$impeccable audit` (both targets) — **13/20 Acceptable**
Scope: `apps/web/src` + `packages/sdk` (SDK clean, no UI action needed)
Order: fix top-to-bottom. Check off one at a time, re-run `$impeccable audit` at the end.

How to use:
- [ ] = todo, [x] = done
- Each issue lists location, fix steps, and done-criteria
- Suggested impeccable command per issue

---

## P1 — Major (fix before release)

### [x] 1. Add `prefers-reduced-motion` support
- **Files**: `apps/web/src/styles/globals.css:132-147`, `apps/web/tailwind.config.ts:62-70`, `apps/web/src/components/ui/Button.tsx:38-39`, `apps/web/src/app/page.tsx:65-68`
- **Problem**: shimmer, spin, pulse-subtle, framer-motion entrances run unconditionally. WCAG 2.3.3.
- **Fix**:
  1. Add to `globals.css`: `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } html { scroll-behavior: auto; } .skeleton { animation: none; } }`
  2. Gate framer-motion entrances with `useReducedMotion()` (hero in `app/page.tsx`, `TokenCard`, modals).
  3. Ensure `animate-spin` / `animate-pulse-subtle` respect the media query (they will via step 1).
- **Done when**: With OS reduced-motion ON, no shimmer/spin/pulse/entrance animation plays; content still appears.
- **Command**: `$impeccable harden`

### [x] 2. Generic Modal missing dialog semantics + focus management
- **Files**: `apps/web/src/components/ui/Modal.tsx:24-53` (compare good example `TransactionConfirmationModal.tsx:59-61`)
- **Problem**: No `role="dialog"`, no `aria-modal`, no focus trap, no focus return.
- **Fix**:
  1. Add `role="dialog" aria-modal="true" aria-labelledby` (add `id` to title `h2`).
  2. Trap Tab focus inside dialog while open; Escape already works — keep it.
  3. On open, focus first focusable; on close, return focus to trigger (store `document.activeElement`).
  4. Keep `body overflow hidden` lock while open.
- **Done when**: SR announces dialog; Tab never escapes overlay; focus returns on close; `axe` reports no dialog violations.
- **Command**: `$impeccable harden`

### [x] 3. Link Input errors to fields
- **Files**: `apps/web/src/components/ui/Input.tsx:22-29`, callers `trade/BuyForm.tsx:199-208`, `tokens/CreateTokenForm.tsx:245-260`
- **Problem**: Error `<p>` has no `id`; input missing `aria-invalid` / `aria-describedby`.
- **Fix**:
  1. In `Input.tsx`: generate `errorId = {inputId}-error`; set `aria-invalid={!!error}`, `aria-describedby={error ? errorId : undefined}`; give error `<p id={errorId}>`.
  2. Add `aria-required` where `required` is passed.
  3. No visual change.
- **Done when**: Inspecting an errored input shows `aria-invalid="true"` + `aria-describedby` pointing to existing error id.
- **Command**: `$impeccable harden`

### [x] 4. Make PriceChart accessible + theme-aware
- **Files**: `apps/web/src/components/trade/PriceChart.tsx:82-196`
- **Problem**: Canvas has only `aria-label`; grid/text hard-coded `#a1a1aa` / `rgba(39,39,42,*)` invisible in light theme; range buttons lack `aria-pressed`.
- **Fix**:
  1. Read colors from CSS vars by theme (`getComputedStyle` or `data-theme` switch): text/grid/line for dark + light.
  2. Add `aria-pressed={timeRange===range}` to each range button.
  3. Add visually-hidden data summary: `<p className="sr-only" id="price-summary">` with current price + range, referenced via `aria-describedby` on chart container; or a `<table className="sr-only">` of points.
- **Done when**: Light theme grid/labels readable; SR gets price summary; range buttons expose pressed state.
- **Command**: `$impeccable harden`

### [x] 5. Fix broken / hard-coded theme escapes
- **Files**: `apps/web/src/app/global-error.tsx:14-17`, `apps/web/src/app/error.tsx:31`, `apps/web/src/app/not-found.tsx:17`
- **Problem**: `global-error` uses `bg-[#0f172a] text-[#f1f5f9]`; `error`/`not-found` use nonexistent `var(--forgex-text)`.
- **Fix**:
  1. `global-error.tsx`: replace with `bg-background text-foreground`, card `bg-card border-border`, muted text `text-muted-foreground`.
  2. `error.tsx` + `not-found.tsx`: replace `text-[var(--forgex-text)]` with `text-foreground`.
  3. Leave `opengraph-image.tsx` hex as-is (image render, document as exception with code comment).
- **Done when**: `grep -r "forgex-text" apps/web/src` returns nothing; `grep -r "#0f172a" apps/web/src/app` returns only opengraph-image; error pages render correctly in both themes.
- **Command**: `$impeccable colorize`

### [x] 6. Add pressed state to toggle groups
- **Files**: `apps/web/src/components/trade/SlippageTolerance.tsx:64-76`, `apps/web/src/components/trade/PriceChart.tsx:174-186`
- **Problem**: Selection conveyed by color only.
- **Fix**: Add `aria-pressed={isSelected}` (slippage presets) and `aria-pressed={timeRange===range}` (chart ranges). No visual change needed.
- **Done when**: Every preset/range button exposes correct `aria-pressed` in DOM.
- **Command**: `$impeccable harden`

---

## P2 — Minor (next pass)

### [x] 7. Raise touch targets to 44px
- **Files**: `components/ui/Button.tsx:31-34`, `layout/Header.tsx:98`, `ui/ThemeToggle.tsx:27`, `ui/Toast.tsx:110-117`, `trade/SlippageTolerance.tsx:68`, `trade/PriceChart.tsx:178`
- **Problem**: Buttons `h-8/h-9` (32/36px), icon buttons `w-8 h-8`, dismiss `p-1`, presets `py-1`. WCAG 2.5.8.
- **Fix**:
  1. Icon buttons (menu, theme, copy, dismiss, modal close): `min-h-[44px] min-w-[44px]` (keep visual icon size, expand padding).
  2. `Button sm/md`: keep `h-8/h-9` visuals on desktop, add `@media (pointer: coarse)` override or `min-h-[44px]` on mobile usages (header, forms, presets).
  3. Slippage presets + chart ranges: `py-2 px-3` minimum.
- **Done when**: All interactive elements measure ≥44×44 CSS px on mobile viewport; no layout breakage on desktop.
- **Command**: `$impeccable adapt`

### [x] 8. Optimize token avatar images
- **Files**: `apps/web/src/components/tokens/TokenAvatar.tsx:40-46`
- **Problem**: Raw `<img>`, no dimensions (CLS risk), no `next/image`.
- **Fix**:
  1. Switch to `next/image` with explicit `width/height` per `size` (sm 28, md 36, lg 48, xl 64) + `sizes` attribute.
  2. Keep `loading="lazy"`, `onError` fallback, `alt`; add `decoding="async"`.
  3. Add `preconnect` for IPFS gateway in `layout.tsx` if remote images common.
- **Done when**: No layout shift on feed load; Lighthouse CLS improves; fallback gradient still shows on error.
- **Command**: `$impeccable optimize`

### [x] 9. Stop recreating chart on filter change
- **Files**: `apps/web/src/components/trade/PriceChart.tsx:74-151`
- **Problem**: `useEffect([filteredData])` does `remove() + createChart()` per click; duplicate resize handlers.
- **Fix**:
  1. Create chart + series once (empty deps + `height`); update data via `series.setData()` in separate effect.
  2. Keep single `ResizeObserver`; drop `window resize` listener.
  3. Verify `fitContent()` still called after data update.
- **Done when**: Clicking 1H/24H/7D/1M/ALL does not recreate canvas node (check DevTools elements); no resize leak.
- **Command**: `$impeccable optimize`

### [x] 10. De-motion generic Button
- **Files**: `apps/web/src/components/ui/Button.tsx:37-44`
- **Problem**: Every button mounts framer-motion for a 1% scale effect.
- **Fix**: Replace `motion.button` with plain `<button>` + `active:scale-[0.98] transition-transform`; reserve motion for hero/dialogs.
- **Done when**: All buttons still show press feedback; bundle includes fewer motion mounts; reduced-motion users see no scale.
- **Command**: `$impeccable optimize`

### [x] 11. Hide decorative icons from AT
- **Files**: `components/ui/Toast.tsx:42-62`, `trade/SlippageTolerance.tsx:107-113`, `tokens/CreateTokenForm.tsx:203`
- **Problem**: `i/✓/✕` divs and decorative SVGs announced by SR.
- **Fix**: Add `aria-hidden="true"` to all decorative icon wrappers (toast icons, warning svg, step checkmark). Toast card `role` already correct — don't change.
- **Done when**: SR reads toast title/message once, no "checkmark/i" prefix.
- **Command**: `$impeccable clarify`

### [x] 12. Enlarge dismiss affordances, verify toast timing
- **Files**: `components/ui/Toast.tsx:110-117`, `components/trade/TransactionConfirmationModal.tsx:82-90`, `hooks/useToast.ts`
- **Problem**: `✕` glyph, tiny hit area; auto-dismiss duration/hover-pause unverified.
- **Fix**:
  1. Replace `✕` text with SVG X icon, 44px hit area, keep `aria-label`.
  2. Confirm toast `durationMs` (success 5s, error 6s) + hover-pause behavior; document in code if missing.
- **Done when**: Dismiss buttons ≥32px visual / 44px hit; toasts readable before dismiss.
- **Command**: `$impeccable adapt`

---

## P3 — Polish (if time permits)

### [x] 13. Reconcile avatar gradients with monochrome claim
- **Files**: `apps/web/src/lib/ipfs.ts:38-47`
- **Problem**: 8-color gradients (violet/pink/cyan/...) vs `globals.css:6` "monochromatic".
- **Fix (pick one)**: (a) Constrain to neutrals + single blue accent, or (b) keep identicons and edit comment to "functional identicons exempt from monochrome rule". Update detector expectation accordingly.
- **Done when**: Either palette narrowed or exemption documented; audit no longer flags as drift.
- **Command**: `$impeccable quieter`

### [x] 14. Label simulated / hard-coded data
- **Files**: `components/trade/PriceChart.tsx:41-56`, `tokens/CreateTokenForm.tsx:129`, `app/page.tsx:8-13`
- **Problem**: Random chart points, random contract IDs, hero stats (1,247 / 2.4M) presented as real.
- **Fix**: Add "Demo data" badge on chart when `!data`; add "Simulated" note on mock tx path; add `// TODO: replace with on-chain stats` or source comment on hero stats.
- **Done when**: No mock value can be mistaken for live on-chain data.
- **Command**: `$impeccable clarify`

---

## Final verification

### [x] 15. Re-run audit + tests
- **Steps**:
  1. `cd apps/web && sh ../../.claude/skills/impeccable/scripts/impeccable detect --json src` — expect 0 warnings or only documented exemptions.
  2. Run `$impeccable audit` — target ≥17/20 Good.
  3. Run unit tests: `npm test --workspace=apps/web` (or `pnpm --filter web test` per repo setup).
  4. Manual check: keyboard-only flow (landing → explore → token → buy → modal Esc/Tab), both themes, 360px viewport, reduced-motion ON.
- **Command**: `$impeccable polish`
