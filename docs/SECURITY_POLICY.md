# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | ✅ Security updates |
| < Latest| ❌ No updates       |

**Always deploy the latest contracts and SDK.** Old versions may contain unpatched vulnerabilities.

---

## Reporting a Vulnerability

### Responsible Disclosure

**Do not open public issues for security vulnerabilities.** Instead:

1. **Email**: security@forgex.app (PGP key: `0xABCDEF1234567890`)
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

| Phase | Timeline |
|-------|----------|
| Acknowledgment | 48 hours |
| Initial assessment | 1 week |
| Fix development | 2-4 weeks |
| Public disclosure | After fix deployed + 2 weeks |

We follow coordinated disclosure. Credit given in release notes (unless anonymity requested).

---

## Audit Checklist

### Smart Contracts (Rust/Soroban)

#### Access Control
- [ ] All admin-only functions protected by `require_auth()`
- [ ] Admin role transferable only by current admin
- [ ] No functions allow unauthorized state changes
- [ ] Multi-sig used for mainnet admin (3-of-5 minimum)

#### Reentrancy Protection
- [ ] Transfer hooks use reentrancy guards (`storage.set()` before external call)
- [ ] No external calls after state changes without guard
- [ ] `transfer_from` validates allowance before transfer

#### Integer Safety
- [ ] All arithmetic uses checked operations (`checked_add`, `checked_sub`, `checked_mul`, `checked_div`)
- [ ] No unchecked casts between `i128`/`u128`/`u64`/`u32`
- [ ] Fixed-point math uses `SCALE = 10^7` consistently
- [ ] Overflow/underflow tests cover edge cases

#### Token Contract (SEP-41)
- [ ] `mint`/`burn` restricted to admin + target account
- [ ] `max_supply` enforced in `mint`
- [ ] `transfer`/`transfer_from` pause-guarded
- [ ] `approve`/`allowance` expiration stored (even if unused)
- [ ] Transfer hook reentrancy guard tested
- [ ] SEP-41 events emitted for all state changes

#### Factory Contract
- [ ] `create_token` validates:
  - [ ] `token_id` and `curve_id` exist on ledger
  - [ ] Name/symbol length (1-32 bytes)
  - [ ] Decimals 0-255
  - [ ] Max supply > 0
  - [ ] No duplicate token_id, name, or symbol
- [ ] Admin-only: `initialize`, `set_admin`, `remove_token`
- [ ] Registry maintains stable creation order for pagination
- [ ] `TokenCreated` event includes full registry record

#### Bonding Curve Contract
- [ ] `buy`:
  - [ ] `amount_out > 0`
  - [ ] `max_cost` slippage check
  - [ ] `deadline` expiration check
  - [ ] Cost calculation uses fixed-point Taylor series (15 terms)
  - [ ] Reserve updated atomically
- [ ] `sell`:
  - [ ] `amount_in > 0`
  - [ ] `min_payout` slippage check
  - [ ] `deadline` expiration check
  - [ ] Payout calculation mirrors buy formula
  - [ ] Reserve updated atomically
- [ ] Price formula: `P(S) = P₀ × e^(k×S)` with `SCALE = 10^7`
- [ ] `get_curve_info` returns all state for verification
- [ ] Admin-only: `initialize`

#### General
- [ ] All public functions have explicit error codes
- [ ] Error codes documented in `error.rs`
- [ ] No `panic!` in production paths (only for unreachable/unrecoverable)
- [ ] Storage keys namespaced to avoid collisions
- [ ] Contract upgradeability via `__constructor` + `upgrade` (token only)

---

### SDK (TypeScript)

#### Input Validation
- [ ] All contract args validated before encoding
- [ ] Address validation uses `StrKey.isValidEd25519PublicKey` + `isValidContract`
- [ ] Amount strings parsed as `BigInt` (no float)
- [ ] `CreateTokenParams` validated client-side before submit

#### Transaction Safety
- [ ] `invoke` simulates before submit
- [ ] Simulation errors thrown (not silently ignored)
- [ ] Signer functions validated (Keypair or async function)
- [ ] Timeout configurable (default 60s)
- [ ] Polling interval fixed (1s) to avoid RPC rate limits

#### Type Safety
- [ ] All contract return types decoded with `scValToNative`
- [ ] `TokenInfo`/`CurveInfo` types match contract structs exactly
- [ ] No `any` types in public API

#### Browser Safety
- [ ] No `require()` or Node-only APIs in SDK source
- [ ] `StrKey` imported statically from `@stellar/stellar-sdk`
- [ ] Works in browser bundlers (Webpack, Vite, Next.js)

---

### Frontend (Next.js/React)

#### Wallet Integration
- [ ] Freighter `getAddress` used (not deprecated `getPublicKey`)
- [ ] Transaction signing via `signTransaction` async callback
- [ ] Network passphrase verified before signing
- [ ] User prompted for each transaction

#### Data Handling
- [ ] All amounts displayed via `formatXLM`/`formatTokenAmount` (no raw stroops)
- [ ] BigInt used for calculations, strings for display
- [ ] No `eval()` or `dangerouslySetInnerHTML`

#### CSP & Headers
- [ ] `Content-Security-Policy` configured in `next.config.js`
- [ ] `X-Frame-Options: DENY`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`

---

### CI/CD Pipeline

- [ ] Contract builds run `cargo clippy --all-targets -D warnings`
- [ ] Contract tests pass (`cargo test --lib`)
- [ ] SDK typecheck passes (`tsc --noEmit`)
- [ ] Frontend typecheck passes
- [ ] Frontend lint passes (`next lint`)
- [ ] Deploy workflow requires manual approval for mainnet
- [ ] Secrets stored in GitHub Secrets (not repo)

---

### Operational Security

- [ ] Deployer keys stored in hardware wallet / HSM
- [ ] Mainnet admin is multi-sig (3-of-5)
- [ ] Factory admin transferred to governance after launch
- [ ] Monitoring alerts on:
  - [ ] Contract deployment events
  - [ ] Admin changes
  - [ ] Large token mints/burns
  - [ ] Failed transactions spike

---

## Known Limitations

1. **Allowance expiration stored but not enforced** — Token contract stores `expiration` in `approve` but `allowance` doesn't check it. Planned for v2.
2. **Transfer hook reentrancy guard** — Single-guard per contract; nested hooks from same contract blocked. Cross-contract reentrancy possible.
3. **Curve deadline uses ledger timestamp** — Not wall-clock time; depends on ledger close time (~5s). Acceptable for slippage protection.
4. **No on-chain governance** — Factory admin single key (testnet) or multi-sig (mainnet). Parameter updates require new contract deploy.

---

## Contact

- **Security email**: security@forgex.app
- **PGP key**: Available on keyservers (fingerprint: `ABCD EF12 3456 7890`)
- **Bug bounty**: Not currently offered (pre-mainnet)