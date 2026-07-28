# Security Model

## Smart Contract Security

| Concern | Mitigation |
|---|---|
| Reentrancy | Soroban execution model prevents reentrancy by default |
| Integer overflow | Rust checked arithmetic with i128 |
| Access control | mint/burn restricted to factory/curve admin |
| Curve manipulation | Parameters immutable after initialization |
| Front-running | Stellar's deterministic ordering; slippage protection on UI |
| Storage exhaustion | Bounded registry with pagination |

## Frontend Security

| Concern | Mitigation |
|---|---|
| Private key exposure | Never handle secret keys; all signing via Freighter |
| XSS | React's built-in escaping; sanitize user inputs |
| IPFS content | Validate image types; serve via gateway with CSP |
| Contract ID integrity | Hardcode verified contract IDs |

## Best Practices

1. All contracts are unit tested with `soroban test`
2. Math is fuzz-tested for edge cases
3. Testnet deployment before any mainnet consideration
4. Open source enables community audit
5. Formal audit required before mainnet launch (v2)
