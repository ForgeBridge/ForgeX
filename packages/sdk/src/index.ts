export { ForgeXClient } from './ForgeXClient'
export type { ForgeXClientConfig, ForgeXClientFullConfig } from './ForgeXClient'
export { SorobanClient } from './client'
export type {
  ForgeXNetwork,
  InvokeOptions,
  ReadOptions,
  InvokeResult,
  SorobanClientConfig,
  TransactionSigner,
} from './client'

export { TokenClient } from './contracts/token'
export { FactoryClient } from './contracts/factory'
export { BondingCurveClient } from './contracts/bonding-curve'

export type { TokenMetadata, InterfaceVersion, TokenInfo, CreateTokenParams } from './types/token'
export type { CurveParams, CurveInfo, CurveState } from './types/curve'
export type { ForgeXEvent, BuyEvent, SellEvent, TokenCreatedEvent } from './types/events'

export {
  address,
  addressOption,
  bool,
  bytes,
  i128,
  string,
  symbol,
  u32,
  u64,
  vec,
  toNative,
  toAmount,
  toBool,
  toAddress,
  toOptionAddress,
} from './abi'

export {
  formatXLM,
  parseXLM,
  formatTokenAmount,
  parseTokenAmount,
  validateAddress,
  validateCreateTokenParams,
} from './utils'