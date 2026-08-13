# ForgeX SDK API Reference

## Installation

```bash
npm install @forgex/sdk
# or
yarn add @forgex/sdk
# or
pnpm add @forgex/sdk
```

Peer dependencies: `@stellar/stellar-sdk@^12.0.0`

---

## Quick Start

```typescript
import { ForgeXClient } from '@forgex/sdk'

const client = new ForgeXClient({
  network: 'testnet',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  networkPassphrase: 'Test SDF Network ; September 2015'
})

// Read token info
const tokenInfo = await client.factory(FACTORY_ID).getToken(TOKEN_ID)

// Get curve price
const price = await client.bondingCurve(CURVE_ID).getPrice()

// Buy tokens (requires Freighter signer)
const cost = await client.bondingCurve(CURVE_ID).buy(
  userAddress,
  amountOut,
  maxCost,
  deadline,
  { source: userAddress, signers: [freighterSigner] }
)
```

---

## Core Classes

### `ForgeXClient`

Top-level facade for all contract interactions.

```typescript
class ForgeXClient {
  constructor(config: ForgeXClientConfig)
  
  // Config getters
  readonly networkPassphrase: string
  readonly rpcUrl: string
  
  // Low-level access
  readonly soroban: SorobanClient
  
  // Contract accessors
  token(contractId: string): TokenClient
  factory(contractId: string): FactoryClient
  bondingCurve(contractId: string): BondingCurveClient
  
  // Convenience methods
  createToken(factoryId: string, params: CreateTokenParams, options: InvokeOptions): Promise<{ tokenId: string; curveId: string }>
  getTokenInfo(factoryId: string, tokenId: string, options?: ReadOptions): Promise<TokenInfo>
  getLatestLedger(): Promise<number>
}
```

#### `ForgeXClientConfig`

```typescript
interface ForgeXClientConfig {
  network: 'testnet' | 'mainnet'
  rpcUrl: string
  networkPassphrase?: string  // Auto-set from network if omitted
  allowHttp?: boolean         // Allow HTTP RPC (testnet only)
}
```

---

### `SorobanClient`

Low-level RPC client used by all typed clients.

```typescript
class SorobanClient {
  constructor(config: SorobanClientConfig)
  
  // Read-only simulation
  read(contractId: string, method: string, args: xdr.ScVal[], options?: ReadOptions): Promise<xdr.ScVal | undefined>
  
  // Full invoke: simulate → assemble → sign → submit → wait
  invoke(contractId: string, method: string, args: xdr.ScVal[], options: InvokeOptions): Promise<InvokeResult>
  
  // Utilities
  getLatestLedger(): Promise<number>
  getAccount(address: string): Promise<Account>
}
```

#### `InvokeOptions`

```typescript
interface InvokeOptions {
  source: string                    // Submitter address
  signers: TransactionSigner[]      // Keypair or async function
  timeoutSeconds?: number           // Default: 60
}
```

#### `ReadOptions`

```typescript
interface ReadOptions {
  source?: string  // Default: NULL_ACCOUNT
}
```

#### `TransactionSigner`

```typescript
type TransactionSigner = Keypair | ((envelopeXdr: string) => Promise<string>)
```

#### `InvokeResult`

```typescript
interface InvokeResult {
  hash: string
  status: SorobanRpc.Api.GetTransactionStatus
  retval?: xdr.ScVal
  error?: string
}
```

---

### `TokenClient`

SEP-41 token contract interface.

```typescript
class TokenClient {
  constructor(client: SorobanClient, contractId: string)
  getContractId(): string
  
  // Constructor (deploy-time)
  static constructorArgs(params: {
    admin: string
    name: string
    symbol: string
    decimals: number
    max_supply: string
  }): xdr.ScVal[]
  
  // Contract metadata
  version(): Promise<InterfaceVersion>
  name(): Promise<string>
  symbol(): Promise<string>
  decimals(): Promise<number>
  metadata(): Promise<TokenMetadata>
  
  // Admin functions
  mint(to: string, amount: string, options: InvokeOptions): Promise<string>
  burn(from: string, amount: string, options: InvokeOptions): Promise<string>
  setPaused(paused: boolean, options: InvokeOptions): Promise<void>
  setAdmin(newAdmin: string, options: InvokeOptions): Promise<void>
  adminTransfer(from: string, to: string, amount: string, options: InvokeOptions): Promise<string>
  setAuthorized(id: string, authorize: boolean, options: InvokeOptions): Promise<void>
  setTransferHook(hook: string | null, options: InvokeOptions): Promise<void>
  upgrade(newWasmHash: Uint8Array | string, options: InvokeOptions): Promise<void>
  
  // Standard token functions
  transfer(from: string, to: string, amount: string, options: InvokeOptions): Promise<string>
  balanceOf(id: string): Promise<string>
  totalSupply(): Promise<string>
  approve(from: string, spender: string, amount: string, expiration: number, options: InvokeOptions): Promise<void>
  allowance(from: string, spender: string): Promise<string>
  transferFrom(spender: string, from: string, to: string, amount: string, options: InvokeOptions): Promise<string>
  
  // Queries
  paused(): Promise<boolean>
  getTransferHook(): Promise<string | null>
  authorized(id: string): Promise<boolean>
}
```

---

### `FactoryClient`

Token factory & registry.

```typescript
class FactoryClient {
  constructor(client: SorobanClient, contractId: string)
  getContractId(): string
  
  // Admin
  initialize(admin: string, options: InvokeOptions): Promise<void>
  
  // Token registry
  createToken(params: CreateTokenParams, options: InvokeOptions): Promise<{ tokenId: string; curveId: string }>
  getAllTokens(options?: ReadOptions): Promise<TokenInfo[]>
  getToken(tokenId: string, options?: ReadOptions): Promise<TokenInfo>
  getTokenCount(options?: ReadOptions): Promise<string>
  getTokensPaginated(offset: number, limit: number, options?: ReadOptions): Promise<TokenInfo[]>
  hasToken(tokenId: string, options?: ReadOptions): Promise<boolean>
  removeToken(tokenId: string, options: InvokeOptions): Promise<void>
  getTokenByName(name: string, options?: ReadOptions): Promise<TokenInfo>
  getTokenBySymbol(symbol: string, options?: ReadOptions): Promise<TokenInfo>
}
```

---

### `BondingCurveClient`

Exponential bonding curve AMM.

```typescript
class BondingCurveClient {
  constructor(client: SorobanClient, contractId: string)
  getContractId(): string
  
  // Initialization
  initialize(tokenId: string, curveParams: CurveParams, admin: string, options: InvokeOptions): Promise<void>
  
  // Trading
  buy(buyer: string, amountOut: string, maxCost: string, deadline: number | bigint, options: InvokeOptions): Promise<string>
  sell(seller: string, amountIn: string, minPayout: string, deadline: number | bigint, options: InvokeOptions): Promise<string>
  
  // Read-only queries
  getPrice(options?: ReadOptions): Promise<string>
  getReserve(options?: ReadOptions): Promise<string>
  getTokensSold(options?: ReadOptions): Promise<string>
  getMarketCap(options?: ReadOptions): Promise<string>
  getCurveInfo(options?: ReadOptions): Promise<CurveInfo>
}
```

---

## Types

### `CreateTokenParams`

```typescript
interface CreateTokenParams {
  /** Address of already-deployed token contract */
  token_id: string
  /** Address of already-deployed bonding curve contract */
  curve_id: string
  /** Display name (1-32 bytes) */
  name: string
  /** Ticker symbol (1-32 bytes) */
  symbol: string
  /** Decimals (0-255) */
  decimals: number
  /** Maximum total supply */
  max_supply: string
  /** Image URI (max 255 bytes) */
  image_uri: string
  /** Description (max 1024 bytes) */
  description: string
  /** Bonding curve parameters */
  curve_params: CurveParams
}
```

### `CurveParams`

```typescript
interface CurveParams {
  /** Initial price per token (stroops, scaled by 10^7) */
  initial_price: string
  /** Steepness factor (scaled by 10^7) */
  steepness: string
  /** Target reserve (stroops) */
  reserve_target: string
}
```

### `TokenInfo`

```typescript
interface TokenInfo {
  token_id: string
  curve_id: string
  creator: string
  name: string
  symbol: string
  decimals: number
  max_supply: string
  image_uri: string
  description: string
  created_at: number  // Unix timestamp
}
```

### `CurveInfo`

```typescript
interface CurveInfo {
  token_id: string
  params: CurveParams
  reserve: string
  tokens_sold: string
  price: string
  market_cap: string
  admin: string
}
```

### `InterfaceVersion`

```typescript
interface InterfaceVersion {
  interface: number
  implementation: number
}
```

### `TokenMetadata` (SEP-41)

```typescript
interface TokenMetadata {
  admin: string
  name: string
  symbol: string
  decimals: number
  max_supply: string
}
```

---

## ABI Helpers (`@forgex/sdk/abi`)

```typescript
// Encoding
address(value: string): xdr.ScVal
addressOption(value: string | null): xdr.ScVal
bool(value: boolean): xdr.ScVal
bytes(value: Uint8Array | ArrayBuffer | Buffer): xdr.ScVal
i128(value: string | number | bigint): xdr.ScVal
string(value: string): xdr.ScVal
symbol(value: string): xdr.ScVal
u32(value: number): xdr.ScVal
u64(value: number | bigint): xdr.ScVal
vec(values: xdr.ScVal[]): xdr.ScVal

// Decoding
toNative(value: xdr.ScVal | undefined): unknown
toAmount(value: xdr.ScVal | undefined): string
toBool(value: xdr.ScVal | undefined): boolean
toAddress(value: xdr.ScVal | undefined): string
toOptionAddress(value: xdr.ScVal | undefined): string | null
```

---

## Utilities (`@forgex/sdk/utils`)

```typescript
formatXLM(stroops: string | bigint): string           // "10000000" → "1.00"
parseXLM(xlm: string): bigint                          // "1.5" → 15000000n
formatTokenAmount(amount: string | bigint, decimals?: number): string
parseTokenAmount(amount: string, decimals?: number): bigint
validateAddress(address: string): boolean
validateCreateTokenParams(params: { name, symbol, max_supply, initial_price }): string[]
```

---

## Events (`@forgex/sdk/types/events`)

```typescript
type ForgeXEvent = BuyEvent | SellEvent | TokenCreatedEvent

interface BuyEvent {
  type: 'buy'
  buyer: string
  amount_out: string
  cost: string
  timestamp: number
}

interface SellEvent {
  type: 'sell'
  seller: string
  amount_in: string
  payout: string
  timestamp: number
}

interface TokenCreatedEvent {
  type: 'token_created'
  token_id: string
  curve_id: string
  creator: string
  name: string
  symbol: string
  decimals: number
  max_supply: string
  image_uri: string
  description: string
  created_at: number
}
```

---

## Freighter Signer Example

```typescript
import { ForgeXClient } from '@forgex/sdk'

async function getFreighterSigner(address: string) {
  const freighter = await import('@stellar/freighter-api')
  return async (envelopeXdr: string) => {
    const result = await freighter.signTransaction(envelopeXdr, {
      networkPassphrase: 'Test SDF Network ; September 2015',
      address
    })
    if ('error' in result) throw new Error(result.error)
    return result.signedTxXdr
  }
}

// Usage
const signer = await getFreighterSigner(userAddress)
const result = await client.bondingCurve(CURVE_ID).buy(
  userAddress,
  '10000000',   // amountOut (1 token at 7 decimals)
  '11000000',   // maxCost (10% slippage)
  Math.floor(Date.now() / 1000) + 3600,  // deadline: 1 hour
  { source: userAddress, signers: [signer] }
)
```

---

## Error Handling

```typescript
try {
  const result = await client.invoke(...)
  if (result.status === 'SUCCESS') {
    // Use result.retval
  } else if (result.status === 'FAILED') {
    console.error('Transaction failed:', result.error)
  }
} catch (err) {
  if (err.message.includes('simulation failed')) {
    // Contract logic error (invalid params, insufficient balance, etc.)
  } else {
    // Network/RPC error
  }
}
```

---

## Network Configuration

```typescript
const NETWORKS = {
  testnet: {
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015'
  },
  mainnet: {
    rpcUrl: 'https://soroban.stellar.org',
    networkPassphrase: 'Public Global Stellar Network ; September 2015'
  }
} as const
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Application                             │
├─────────────────────────────────────────────────────────────┤
│  ForgeXClient (facade)                                        │
│  ├── token(contractId) ──────────▶ TokenClient               │
│  ├── factory(contractId) ───────▶ FactoryClient              │
│  └── bondingCurve(contractId) ──▶ BondingCurveClient         │
├─────────────────────────────────────────────────────────────┤
│  SorobanClient (RPC)                                          │
│  ├── read()     ──▶ simulateTransaction                      │
│  └── invoke()   ──▶ simulate → assemble → sign → submit → wait│
├─────────────────────────────────────────────────────────────┤
│  @stellar/stellar-sdk (SorobanRpc, TransactionBuilder, etc.)  │
└─────────────────────────────────────────────────────────────┘
```

---

## Version Compatibility

| SDK Version | Contract Version | Stellar SDK |
|-------------|------------------|-------------|
| 0.1.x       | 1.x              | ^12.0.0     |

Contract interface version returned by `TokenClient.version()`:
- `interface`: SEP-41 interface version
- `implementation`: Contract implementation version

---

## License

MIT OR Apache-2.0