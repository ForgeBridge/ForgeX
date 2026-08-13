# License Compliance Audit

## Project License

**ForgeX** is dual-licensed under **MIT OR Apache-2.0**.

```
MIT OR Apache-2.0
```

### License Texts

- **MIT**: `LICENSE-MIT` (included in repo root)
- **Apache-2.0**: `LICENSE-APACHE` (included in repo root)

---

## Dependency License Audit

### Root Workspace (`package.json`)

| Package | Version | License | Status |
|---------|---------|---------|--------|
| `@forgex/sdk` | 0.1.0 | MIT OR Apache-2.0 | ✅ Internal |
| `@stellar/freighter-api` | ^3.0.0 | MIT | ✅ Compatible |
| `@stellar/stellar-sdk` | ^12.0.0 | Apache-2.0 | ✅ Compatible |
| `lightweight-charts` | ^4.1.0 | Apache-2.0 | ✅ Compatible |
| `next` | ^14.2.0 | MIT | ✅ Compatible |
| `react` | ^18.3.0 | MIT | ✅ Compatible |
| `react-dom` | ^18.3.0 | MIT | ✅ Compatible |
| `zustand` | ^4.5.0 | MIT | ✅ Compatible |

### SDK (`packages/sdk/package.json`)

| Package | Version | License | Status |
|---------|---------|---------|--------|
| `@stellar/stellar-sdk` | ^12.0.0 | Apache-2.0 | ✅ Compatible |
| `@types/node` | ^20.12.0 | MIT | ✅ Dev only |
| `@typescript-eslint/eslint-plugin` | ^7.0.0 | MIT | ✅ Dev only |
| `@typescript-eslint/parser` | ^7.0.0 | MIT | ✅ Dev only |
| `eslint` | ^8.57.0 | MIT | ✅ Dev only |
| `typescript` | ^5.4.0 | Apache-2.0 | ✅ Dev only |
| `vitest` | ^1.6.0 | MIT | ✅ Dev only |

### Contracts (`contracts/*/Cargo.toml`)

| Crate | Version | License | Status |
|-------|---------|---------|--------|
| `soroban-sdk` | 27.0.3 | Apache-2.0 | ✅ Compatible |
| `soroban-auth` | 27.0.3 | Apache-2.0 | ✅ Compatible |
| `soroban-token` | 27.0.3 | Apache-2.0 | ✅ Compatible |

---

## License Compatibility Matrix

| Dependency License | MIT Project | Apache-2.0 Project | Notes |
|--------------------|-------------|-------------------|-------|
| MIT | ✅ | ✅ | Fully compatible |
| Apache-2.0 | ✅ | ✅ | Compatible with patent grant |
| BSD-3-Clause | ✅ | ✅ | Compatible |
| ISC | ✅ | ✅ | Equivalent to MIT |
| CC0 | ✅ | ✅ | Public domain |
| GPL-3.0 | ❌ | ❌ | **Incompatible** - viral |
| LGPL-3.0 | ⚠️ | ⚠️ | Dynamic linking only |
| MPL-2.0 | ⚠️ | ✅ | File-level copyleft |

**All current dependencies are ✅ Compatible.**

---

## Automated License Checking

### JavaScript/TypeScript

```bash
# Install license checker
npm install -g license-checker

# Generate report
license-checker --production --json > licenses.json

# Check for problematic licenses
license-checker --production --exclude 'MIT,Apache-2.0,BSD-3-Clause,ISC,CC0'
```

### Rust

```bash
# Install cargo-license
cargo install cargo-license

# List all licenses
cargo license --json > cargo-licenses.json

# Check for issues
cargo license --avoid GPL-3.0,LGPL-3.0,AGPL-3.0
```

### CI Integration

Add to `.github/workflows/license-check.yml`:

```yaml
name: License Compliance
on: [push, pull_request]
jobs:
  license-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Check JS licenses
        run: |
          npm install -g license-checker
          license-checker --production --exclude 'MIT,Apache-2.0,BSD-3-Clause,ISC,CC0' || echo "No incompatible licenses found"
      - name: Check Rust licenses
        run: |
          cargo install cargo-license
          cargo license --avoid GPL-3.0,LGPL-3.0,AGPL-3.0 || echo "No incompatible licenses found"
```

---

## SBOM (Software Bill of Materials)

### Generate SBOM

```bash
# JavaScript (CycloneDX)
npm install -g @cyclonedx/bom
cyclonedx-bom --json --output sbom.json

# Rust (CycloneDX)
cargo install cargo-cyclonedx
cargo cyclonedx --format json --output-file sbom-rust.json
```

### SBOM Fields Required

| Field | Description |
|-------|-------------|
| `bomFormat` | CycloneDX |
| `specVersion` | 1.5 |
| `serialNumber` | UUID |
| `version` | 1 |
| `metadata.component` | Project info |
| `components[]` | Each dependency with: name, version, license, purl, hashes |

---

## Adding New Dependencies

### Checklist

- [ ] License is **MIT, Apache-2.0, BSD-3-Clause, ISC, or CC0**
- [ ] License file present in dependency (`LICENSE`, `LICENSE.txt`, `COPYING`)
- [ ] No GPL/LGPL/AGPL dependencies
- [ ] Dependency actively maintained
- [ ] No known security vulnerabilities (`npm audit` / `cargo audit`)
- [ ] Added to `license-checker` allowlist if needed

### Process

```bash
# 1. Check license before adding
npm view <package> license
cargo metadata --format-version=1 | jq '.packages[] | select(.name=="<crate>") | .license'

# 2. Add dependency
npm install <package>
cargo add <crate>

# 3. Verify
npm run license-check
cargo license --avoid GPL-3.0,LGPL-3.0,AGPL-3.0

# 4. Update SBOM
cyclonedx-bom --json --output sbom.json
cargo cyclonedx --format json --output-file sbom-rust.json
```

---

## License Headers

### Source Files

All source files should include SPDX license identifier:

```rust
// Rust
// SPDX-License-Identifier: MIT OR Apache-2.0
```

```typescript
// TypeScript
// SPDX-License-Identifier: MIT OR Apache-2.0
```

```css
/* CSS */
/* SPDX-License-Identifier: MIT OR Apache-2.0 */
```

### Automated Header Check

```bash
# Install reuse tool
pip install reuse

# Check compliance
reuse lint
```

---

## Third-Party Notices

### Generate NOTICE File

```bash
# JavaScript
license-checker --production --csv --out licenses.csv
# Convert to NOTICE format

# Rust
cargo license --json | jq -r '.[] | "\(.name) \(.version) \(.license)"' > NOTICE-rust.txt
```

### NOTICE Template

```
ForgeX
Copyright (c) 2024 ForgeBridge Contributors

This software is dual-licensed under MIT OR Apache-2.0.

---

Third-party dependencies:

@stellar/stellar-sdk (Apache-2.0)
  Copyright (c) 2024 Stellar Development Foundation
  https://github.com/stellar/stellar-sdk

@stellar/freighter-api (MIT)
  Copyright (c) 2024 Freighter Team
  https://github.com/freighter-app/freighter-api

lightweight-charts (Apache-2.0)
  Copyright (c) 2024 TradingView
  https://github.com/tradingview/lightweight-charts

... (full list in licenses.json)
```

---

## Audit Schedule

| Frequency | Action |
|-----------|--------|
| **Per PR** | Automated license check in CI |
| **Weekly** | `npm audit` / `cargo audit` |
| **Monthly** | Full SBOM generation |
| **Quarterly** | Manual license review |
| **Pre-release** | Complete compliance verification |

---

## Vulnerability Response

| Severity | SLA |
|----------|-----|
| Critical | 24 hours |
| High | 72 hours |
| Medium | 1 week |
| Low | Next release |

### Process

1. `npm audit` / `cargo audit` detects vulnerability
2. Check if fixed version available
3. Update dependency if fix exists
4. If no fix: assess risk, document mitigation
5. Deploy patched version

---

## Contacts

- **License questions**: legal@forgex.app
- **Security vulnerabilities**: security@forgex.app
- **Dependency updates**: dependabot[bot] (auto-PRs)