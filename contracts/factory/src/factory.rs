use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Symbol, Vec};

/// Parameters for the bonding curve attached to a new token. The curve price
/// is derived from `initial_price` scaled by `steepness` as minted supply
/// (`tokens_sold`) grows; `reserve_target` is informational metadata.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct CurveParams {
    /// Price of the first token unit, in the order of 1/SCALE precision.
    pub initial_price: i128,
    /// Growth steepness of the exponential curve, scaled by the same factor.
    pub steepness: i128,
    /// Target reserve the launcher intends the curve to eventually hold.
    pub reserve_target: i128,
}

/// Everything needed to register a new token through [`FactoryContract::create_token`].
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct CreateTokenParams {
    /// Display name of the token (1-32 bytes).
    pub name: String,
    /// Ticker symbol of the token (1-32 bytes).
    pub symbol: String,
    /// Number of decimals used to represent token amounts (0-255).
    pub decimals: u32,
    /// Maximum total supply the token may ever reach.
    pub max_supply: i128,
    /// Optional image URI for the token's branding.
    pub image_uri: String,
    /// Optional free-text description of the token.
    pub description: String,
    /// Bonding curve parameters for the token's curve contract.
    pub curve_params: CurveParams,
}

/// Public, on-chain registry record for a created token. Returned by the
/// factory's read entry points.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct TokenInfo {
    /// Address of the deployed token contract.
    pub token_id: Address,
    /// Address of the deployed bonding curve contract (currently the same as
    /// `token_id`).
    pub curve_id: Address,
    /// Address that created (and therefore administer) the token.
    pub creator: Address,
    /// Display name of the token.
    pub name: String,
    /// Ticker symbol of the token.
    pub symbol: String,
    /// Number of decimals used to represent token amounts.
    pub decimals: u32,
    /// Maximum total supply the token may ever reach.
    pub max_supply: i128,
    /// Optional image URI for the token's branding.
    pub image_uri: String,
    /// Optional free-text description of the token.
    pub description: String,
    /// Ledger timestamp recorded when the token was created.
    pub created_at: u64,
}

/// A registry for the tokens created through this factory.
#[contract]
pub struct FactoryContract;

#[contractimpl]
impl FactoryContract {
    /// Configures the factory's admin. Must be called once, by the deploying
    /// account, before any tokens can be created.
    pub fn initialize(env: Env, admin: Address) {
        env.storage().instance().set(&"admin", &admin);
    }

    /// Registers a new token in the factory's public registry. Admin only.
    ///
    /// The token metadata is validated against the same constraints the token
    /// contract enforces (1-32 byte name and symbol, decimals 0-255, a
    /// non-negative max supply) so the registry can never hold a record that
    /// could not exist as a real token. Emits a `TokenCreated` event carrying
    /// the token and curve addresses.
    pub fn create_token(env: Env, params: CreateTokenParams) -> (Address, Address) {
        let admin: Address = env.storage().instance().get(&"admin").unwrap();
        admin.require_auth();
        // Mirror the token contract's SEP-41 metadata validation so the
        // registry never holds records that could not be a real token.
        if params.name.is_empty() || params.name.len() > 32 {
            panic!("factory: token name must be 1-32 bytes");
        }
        if params.symbol.is_empty() || params.symbol.len() > 32 {
            panic!("factory: token symbol must be 1-32 bytes");
        }
        if params.decimals > 255 {
            panic!("factory: token decimals must be 0-255");
        }
        if params.max_supply < 0 {
            panic!("factory: token max supply cannot be negative");
        }
        let creator = admin.clone();
        let timestamp = env.ledger().timestamp();
        let token_id = env.current_contract_address();
        let curve_id = token_id.clone();
        let info = TokenInfo {
            token_id: token_id.clone(),
            curve_id: curve_id.clone(),
            creator,
            name: params.name,
            symbol: params.symbol,
            decimals: params.decimals,
            max_supply: params.max_supply,
            image_uri: params.image_uri,
            description: params.description,
            created_at: timestamp,
        };
        Registry::push(&env, info.clone());
        // Full-detail event: the data is the complete registry record, so
        // indexers can reconstruct the token without a follow-up read.
        env.events().publish(
            (
                Symbol::new(&env, "TokenCreated"),
                info.creator.clone(),
                token_id.clone(),
            ),
            info,
        );
        (token_id, curve_id)
    }

    /// Returns metadata for every token registered so far, in creation order.
    /// Publicly queryable.
    pub fn get_all_tokens(env: Env) -> Vec<TokenInfo> {
        Registry::all(&env)
    }

    /// Returns metadata for a single token. Publicly queryable. Panics if no
    /// token with that address exists in the registry.
    pub fn get_token(env: Env, token_id: Address) -> TokenInfo {
        Registry::get(&env, token_id)
    }

    /// Returns how many tokens have been registered so far. Publicly
    /// queryable.
    pub fn get_token_count(env: Env) -> u64 {
        Registry::count(&env)
    }

    /// Returns a page of registered tokens, starting at `offset` and taking at
    /// most `limit` entries. `offset` and `offset + limit` are saturated to the
    /// registry size, so out-of-range windows simply return the available
    /// tail. Publicly queryable.
    pub fn get_tokens_paginated(env: Env, offset: u64, limit: u64) -> Vec<TokenInfo> {
        Registry::paginated(&env, offset, limit)
    }
}

/// Internal append-only storage backing the factory's public queries. Not
/// part of the contract interface.
pub struct Registry;

impl Registry {
    /// Appends a token record to the registry and bumps the record count.
    pub fn push(env: &Env, info: TokenInfo) {
        let mut tokens: Vec<TokenInfo> = env
            .storage()
            .persistent()
            .get(&"tokens")
            .unwrap_or(Vec::new(env));
        tokens.push_back(info);
        env.storage().persistent().set(&"tokens", &tokens);
        let count: u64 = env.storage().persistent().get(&"count").unwrap_or(0);
        let new_count = count.checked_add(1).expect("factory: token count overflow");
        env.storage().persistent().set(&"count", &new_count);
    }

    /// Returns every registered token, in creation order.
    pub fn all(env: &Env) -> Vec<TokenInfo> {
        env.storage()
            .persistent()
            .get(&"tokens")
            .unwrap_or(Vec::new(env))
    }

    /// Returns the record for `token_id`. Panics if it is not registered.
    pub fn get(env: &Env, token_id: Address) -> TokenInfo {
        let tokens = Self::all(env);
        tokens
            .into_iter()
            .find(|t| t.token_id == token_id)
            .expect("token not found")
    }

    /// Returns the number of registered tokens.
    pub fn count(env: &Env) -> u64 {
        env.storage().persistent().get(&"count").unwrap_or(0)
    }

    /// Returns a window of registered tokens starting at `offset` and taking
    /// at most `limit` entries.
    pub fn paginated(env: &Env, offset: u64, limit: u64) -> Vec<TokenInfo> {
        let all = Self::all(env);
        let total = all.len();
        let start = (offset as u32).min(total);
        let end = match offset.checked_add(limit) {
            // Saturate instead of wrapping so an absurd offset+limit simply
            // returns everything from the window start.
            Some(v) => (v as u32).min(total),
            None => total,
        };
        let mut result = Vec::new(env);
        for i in start..end {
            result.push_back(all.get(i).unwrap());
        }
        result
    }
}
