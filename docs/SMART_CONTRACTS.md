# Smart Contracts API Reference

## Token Contract

### `initialize(admin, name, symbol, decimals, max_supply)`
Initialize token metadata.

### `mint(to, amount)`
Mint tokens. Only callable by admin (factory/curve).

### `burn(from, amount)`
Burn tokens. Only callable by admin (curve).

### `transfer(from, to, amount)`
Transfer tokens between accounts.

### `balance_of(id) -> i128`
Query token balance.

### `approve(from, spender, amount, expiration)`
Approve spending allowance.

### `allowance(from, spender) -> i128`
Query allowance.

### `metadata() -> TokenMetadata`
Return token metadata (name, symbol, decimals, max_supply).

## Factory Contract

### `initialize(admin)`
Set factory admin.

### `create_token(params) -> (token_id, curve_id)`
Create a new token. Deploys Token + Bonding Curve contracts.

### `get_all_tokens() -> Vec<TokenInfo>`
List all created tokens.

### `get_token(token_id) -> TokenInfo`
Get single token info.

### `get_token_count() -> u64`
Total tokens created.

### `get_tokens_paginated(offset, limit) -> Vec<TokenInfo>`
Paginated token listing.

## Bonding Curve Contract

### `initialize(token_id, curve_params, admin)`
Initialize curve with parameters.

### `buy(buyer, amount_out) -> cost`
Buy tokens. Returns cost in stroops.

### `sell(seller, amount_in) -> payout`
Sell tokens. Returns payout in stroops.

### `get_price() -> i128`
Current price per token.

### `get_reserve() -> i128`
XLM in the pool.

### `get_tokens_sold() -> i128`
Total tokens sold.

### `get_market_cap() -> i128`
Current market cap.

### `get_curve_info() -> CurveInfo`
Full curve state.
