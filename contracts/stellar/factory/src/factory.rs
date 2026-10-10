use soroban_sdk::{
    contract, contractimpl, contracttype, Address, BytesN, Env, IntoVal, String, Symbol, Vec,
};

use crate::error::ContractError;

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct CurveParams {
    /// Current price of the first token unit, in 1/SCALE precision.
    pub initial_price: i128,
    /// Growth steepness of the exponential curve, scaled by the same factor.
    pub steepness: i128,
    /// Target reserve the launcher intends the curve to eventually hold.
    pub reserve_target: i128,
}

/// Everything needed to forge a new token through
/// [`FactoryContract::create_token`].
///
/// The caller supplies only metadata and curve configuration. The factory
/// deploys the token and bonding curve contracts itself, so the caller never
/// handles contract addresses directly.
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
    /// Optional image URI for the token's branding (at most 255 bytes).
    pub image_uri: String,
    /// Optional free-text description of the token (at most 1024 bytes).
    pub description: String,
    /// Bonding curve parameters for the token's curve contract.
    pub curve_params: CurveParams,
}

/// Maximum byte length of a validated token name or symbol, mirroring the
/// SEP-41 metadata format constraint enforced by the token contract.
const MAX_NAME_SYMBOL_LEN: u32 = 32;

/// Maximum byte length of the token's image URI. Keeps registry storage
/// bounded.
const MAX_IMAGE_URI_LEN: u32 = 255;

/// Maximum byte length of the token's description. Keeps registry storage
/// bounded.
const MAX_DESCRIPTION_LEN: u32 = 1024;

/// Public, on-chain registry record for a created token. Returned by the
/// factory's read entry points.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct TokenInfo {
    /// Address of the deployed token contract.
    pub token_id: Address,
    /// Address of the deployed bonding curve contract.
    pub curve_id: Address,
    /// Address that created (and therefore administers) the token.
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
    /// Configures the factory's admin and the WASM blobs used to deploy new
    /// tokens and bonding curves. Must be called once, by the deploying
    /// account, before any tokens can be created. Returns
    /// `AlreadyInitialized` if the factory has already been configured, so
    /// the admin role and the trusted WASM hashes can never be overwritten
    /// through a second call.
    pub fn initialize(
        env: Env,
        admin: Address,
        token_wasm_hash: BytesN<32>,
        curve_wasm_hash: BytesN<32>,
    ) -> Result<(), ContractError> {
        if env.storage().instance().has(&"admin") {
            return Err(ContractError::AlreadyInitialized);
        }
        env.storage().instance().set(&"admin", &admin);
        env.storage()
            .instance()
            .set(&"token_wasm", &token_wasm_hash);
        env.storage()
            .instance()
            .set(&"curve_wasm", &curve_wasm_hash);
        Ok(())
    }

    /// Returns the current factory admin. Publicly queryable.
    pub fn get_admin(env: Env) -> Address {
        Self::read_admin(&env)
    }

    /// Returns the WASM hash the factory deploys token contracts from.
    /// Publicly queryable.
    pub fn get_token_wasm(env: Env) -> BytesN<32> {
        env.storage().instance().get(&"token_wasm").unwrap()
    }

    /// Returns the WASM hash the factory deploys bonding curve contracts
    /// from. Publicly queryable.
    pub fn get_curve_wasm(env: Env) -> BytesN<32> {
        env.storage().instance().get(&"curve_wasm").unwrap()
    }

    /// Updates the token WASM hash used for future deployments. Admin only.
    /// Existing tokens are unaffected.
    pub fn set_token_wasm(env: Env, wasm_hash: BytesN<32>) -> Result<(), ContractError> {
        let admin = Self::read_admin(&env);
        admin.require_auth();
        env.storage().instance().set(&"token_wasm", &wasm_hash);
        Ok(())
    }

    /// Updates the bonding curve WASM hash used for future deployments.
    /// Admin only. Existing curves are unaffected.
    pub fn set_curve_wasm(env: Env, wasm_hash: BytesN<32>) -> Result<(), ContractError> {
        let admin = Self::read_admin(&env);
        admin.require_auth();
        env.storage().instance().set(&"curve_wasm", &wasm_hash);
        Ok(())
    }

    /// Transfers factory ownership to `new_admin`. Admin only.
    ///
    /// After a successful call only `new_admin` can moderate the registry
    /// (remove tokens) and manage factory config. Token creation itself is
    /// permissionless and unaffected by this role.
    /// The new admin must already exist in the ledger so the role can never be
    /// handed to a dead address; otherwise `Err(InvalidAdminAddress)` is
    /// returned and ownership is unchanged. An `AdminChanged` event records
    /// the handover.
    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), ContractError> {
        let admin = Self::read_admin(&env);
        admin.require_auth();
        if !new_admin.exists() {
            return Err(ContractError::InvalidAdminAddress);
        }
        env.storage().instance().set(&"admin", &new_admin.clone());
        env.events().publish(
            (Symbol::new(&env, "AdminChanged"), admin, new_admin.clone()),
            (),
        );
        Ok(())
    }

    /// Forges a new token: deploys its token and bonding curve contracts,
    /// initializes both, and registers the pair in the factory's public
    /// registry. Permissionless: any authenticated caller may forge a token
    /// by passing itself as `creator`.
    ///
    /// The caller authorizes via `creator.require_auth()`, so the registry
    /// always records the true forger as `creator` — the factory admin has no
    /// special forging privilege. The creator becomes the admin of both
    /// deployed contracts (token mint/burn authority and curve fee/limit
    /// authority), so each forged token is self-sovereign from birth.
    ///
    /// The token metadata is validated against the same constraints the token
    /// contract enforces (1-32 byte name and symbol, decimals 0-255, a
    /// non-negative max supply) so the registry can never hold a record that
    /// could not exist as a real token. A duplicate name or symbol is refused
    /// with `TokenExists` and nothing is deployed. Emits a `TokenCreated`
    /// event carrying the full registry record, keyed by creator and token
    /// address. Returns the freshly deployed `(token_id, curve_id)`.
    pub fn create_token(
        env: Env,
        creator: Address,
        params: CreateTokenParams,
    ) -> Result<(Address, Address), ContractError> {
        creator.require_auth();
        Self::validate_params(&params)?;
        if Registry::has_name(&env, &params.name) || Registry::has_symbol(&env, &params.symbol) {
            return Err(ContractError::TokenExists);
        }

        let token_wasm: BytesN<32> = env.storage().instance().get(&"token_wasm").unwrap();
        let curve_wasm: BytesN<32> = env.storage().instance().get(&"curve_wasm").unwrap();
        let nonce = Self::next_nonce(&env);

        // Deploy the token shell (no constructor args — the network rejects
        // address-bearing constructors passed through a cross-contract
        // `deploy_v2`) and initialize it for the new token with the creator
        // as token admin (mint/burn authority).
        let token_id: Address = env
            .deployer()
            .with_current_contract(Self::salt(&env, nonce, 0x01))
            .deploy_v2(token_wasm, ());
        env.invoke_contract::<()>(
            &token_id,
            &Symbol::new(&env, "initialize"),
            soroban_sdk::vec![
                &env,
                creator.clone().into_val(&env),
                params.name.clone().into_val(&env),
                params.symbol.clone().into_val(&env),
                params.decimals.into_val(&env),
                params.max_supply.into_val(&env),
            ],
        );

        // Deploy the curve (no constructor) and initialize it for the new
        // token with the creator as curve admin (fee/limit authority).
        let curve_id: Address = env
            .deployer()
            .with_current_contract(Self::salt(&env, nonce, 0x02))
            .deploy_v2(curve_wasm, ());
        env.invoke_contract::<()>(
            &curve_id,
            &Symbol::new(&env, "initialize"),
            soroban_sdk::vec![
                &env,
                token_id.clone().into_val(&env),
                params.curve_params.clone().into_val(&env),
                creator.clone().into_val(&env),
            ],
        );

        let creator = creator.clone();
        let timestamp = env.ledger().timestamp();
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
        Ok((token_id, curve_id))
    }

    /// Returns whether a token with `token_id` is registered. Publicly
    /// queryable.
    pub fn has_token(env: Env, token_id: Address) -> bool {
        Registry::has(&env, &token_id)
    }

    /// Removes a token from the registry. Admin only.
    ///
    /// Returns `TokenNotFound` when no token with that address is registered.
    /// Removal shrinks the registry while preserving the creation order of the
    /// remaining records, so the stable pagination ordering is maintained.
    pub fn remove_token(env: Env, token_id: Address) -> Result<(), ContractError> {
        let admin = Self::read_admin(&env);
        admin.require_auth();
        Registry::remove(&env, &token_id)
    }

    /// Returns metadata for every token registered so far, in creation order.
    /// Publicly queryable.
    pub fn get_all_tokens(env: Env) -> Vec<TokenInfo> {
        Registry::all(&env)
    }

    /// Returns metadata for a single token. Publicly queryable. Returns
    /// `TokenNotFound` if no token with that address is registered.
    pub fn get_token(env: Env, token_id: Address) -> Result<TokenInfo, ContractError> {
        Registry::get(&env, &token_id)
    }

    /// Returns metadata for the token whose name equals `name`. Publicly
    /// queryable. Token names are unique in the registry, so at most one token
    /// can match. Returns `TokenNotFound` if no token has that name.
    pub fn get_token_by_name(env: Env, name: String) -> Result<TokenInfo, ContractError> {
        Registry::get_by_name(&env, &name).ok_or(ContractError::TokenNotFound)
    }

    /// Returns metadata for the token whose symbol equals `symbol`. Publicly
    /// queryable. Token symbols are unique in the registry, so at most one
    /// token can match. Returns `TokenNotFound` if no token has that symbol.
    pub fn get_token_by_symbol(env: Env, symbol: String) -> Result<TokenInfo, ContractError> {
        Registry::get_by_symbol(&env, &symbol).ok_or(ContractError::TokenNotFound)
    }

    /// Returns how many tokens have been registered so far. Publicly
    /// queryable.
    pub fn get_token_count(env: Env) -> u64 {
        Registry::count(&env)
    }

    /// Returns a page of registered tokens, starting at `offset` and taking at
    /// most `limit` entries. Pages are produced over a stable ordering: records
    /// are always returned in creation order, so paging with any window size
    /// and concatenating the results reproduces the full registry exactly.
    /// `offset` and `offset + limit` are saturated to the registry size, so
    /// out-of-range windows simply return the available tail. Publicly
    /// queryable.
    pub fn get_tokens_paginated(env: Env, offset: u64, limit: u64) -> Vec<TokenInfo> {
        Registry::paginated(&env, offset, limit)
    }
}

impl FactoryContract {
    /// Reads the stored admin. Panics if the factory was never initialized,
    /// which cannot happen because every operation requires an admin.
    fn read_admin(env: &Env) -> Address {
        env.storage().instance().get(&"admin").unwrap()
    }

    /// Returns a fresh deployment nonce and bumps the stored counter. The
    /// counter only moves forward (removals do not decrement it), so every
    /// forged token deploys at unique addresses even across removals in the
    /// same ledger.
    fn next_nonce(env: &Env) -> u64 {
        let nonce: u64 = env.storage().instance().get(&"deploy_nonce").unwrap_or(0);
        env.storage()
            .instance()
            .set(&"deploy_nonce", &nonce.saturating_add(1));
        nonce
    }

    /// Derives a deterministic deployment salt from the nonce and a
    /// per-contract tag (token vs. curve), so the two contracts forged in
    /// one call land at distinct addresses.
    ///
    /// The salt must NOT depend on mutable ledger state (sequence,
    /// timestamp): the transaction's storage footprint is fixed at
    /// simulation time from the simulated salt, so a salt that shifts
    /// between simulation and application would write outside the declared
    /// footprint and the transaction would fail on-chain. The nonce alone
    /// guarantees uniqueness — it only moves forward and is never reused,
    /// so every forged pair lands at fresh addresses.
    fn salt(env: &Env, nonce: u64, tag: u8) -> BytesN<32> {
        let mut bytes = [0u8; 32];
        bytes[0..8].copy_from_slice(&nonce.to_be_bytes());
        bytes[31] = tag;
        BytesN::from_array(env, &bytes)
    }

    /// Validates create input before anything is written to the registry.
    ///
    /// Mirrors the token contract's SEP-41 metadata constraints (1-32 byte
    /// name and symbol, decimals 0-255, non-negative max supply) and bounds
    /// the free-form image URI and description so registry storage stays
    /// finite. The curve parameters must describe a usable curve: a positive
    /// initial price and steepness, and a non-negative reserve target.
    fn validate_params(params: &CreateTokenParams) -> Result<(), ContractError> {
        if params.name.is_empty() || params.name.len() > MAX_NAME_SYMBOL_LEN {
            return Err(ContractError::InvalidMetadata);
        }
        if params.symbol.is_empty() || params.symbol.len() > MAX_NAME_SYMBOL_LEN {
            return Err(ContractError::InvalidMetadata);
        }
        if params.decimals > 255 {
            return Err(ContractError::InvalidMetadata);
        }
        if params.max_supply < 0 {
            return Err(ContractError::InvalidMetadata);
        }
        if params.image_uri.len() > MAX_IMAGE_URI_LEN {
            return Err(ContractError::InvalidMetadata);
        }
        if params.description.len() > MAX_DESCRIPTION_LEN {
            return Err(ContractError::InvalidMetadata);
        }
        if params.curve_params.initial_price <= 0
            || params.curve_params.steepness <= 0
            || params.curve_params.reserve_target < 0
        {
            return Err(ContractError::InvalidCurveParams);
        }
        Ok(())
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

    /// Returns the record for `token_id`, or `TokenNotFound` if it is not
    /// registered.
    pub fn get(env: &Env, token_id: &Address) -> Result<TokenInfo, ContractError> {
        Self::all(env)
            .into_iter()
            .find(|t| &t.token_id == token_id)
            .ok_or(ContractError::TokenNotFound)
    }

    /// Returns the record for `name`, if one is registered.
    pub fn get_by_name(env: &Env, name: &String) -> Option<TokenInfo> {
        Self::all(env).into_iter().find(|t| &t.name == name)
    }

    /// Returns the record for `symbol`, if one is registered.
    pub fn get_by_symbol(env: &Env, symbol: &String) -> Option<TokenInfo> {
        Self::all(env).into_iter().find(|t| &t.symbol == symbol)
    }

    /// Returns whether a token with `token_id` is registered.
    pub fn has(env: &Env, token_id: &Address) -> bool {
        Self::get(env, token_id).is_ok()
    }

    /// Returns whether a token named `name` is registered.
    pub fn has_name(env: &Env, name: &String) -> bool {
        Self::get_by_name(env, name).is_some()
    }

    /// Returns whether a token with symbol `symbol` is registered.
    pub fn has_symbol(env: &Env, symbol: &String) -> bool {
        Self::get_by_symbol(env, symbol).is_some()
    }

    /// Returns the number of registered tokens.
    pub fn count(env: &Env) -> u64 {
        env.storage().persistent().get(&"count").unwrap_or(0)
    }

    /// Removes the record for `token_id`, returning `TokenNotFound` if it is
    /// not registered. The remaining records keep their relative creation
    /// order, and the count is decremented.
    pub fn remove(env: &Env, token_id: &Address) -> Result<(), ContractError> {
        let mut tokens: Vec<TokenInfo> = Self::all(env);
        let mut index = None;
        for (i, token) in tokens.iter().enumerate() {
            if &token.token_id == token_id {
                index = Some(i as u32);
                break;
            }
        }
        let index = index.ok_or(ContractError::TokenNotFound)?;
        tokens.remove(index);
        env.storage().persistent().set(&"tokens", &tokens);
        let count: u64 = env.storage().persistent().get(&"count").unwrap_or(0);
        env.storage()
            .persistent()
            .set(&"count", &count.saturating_sub(1));
        Ok(())
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
