use soroban_sdk::{contracttype, Address, Env, String};

use crate::error::TokenError;

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct TokenMetadata {
    /// The current admin, the only address allowed to perform privileged
    /// operations (mint, burn, pause, revoke, upgrade, ...).
    pub admin: Address,
    /// The token's display name (1-32 bytes).
    pub name: String,
    /// The token's ticker symbol (1-32 bytes).
    pub symbol: String,
    /// The number of decimals used to represent token amounts (0-255).
    pub decimals: u32,
    /// The maximum total supply the token may ever reach.
    pub max_supply: i128,
}

impl TokenMetadata {
    /// Validates token metadata against the constraints of the SEP-41 token
    /// metadata format:
    ///
    /// - `name` must be non-empty and at most 32 bytes (the XDR `SCSymbol`
    ///   limit the standard format stores names under).
    /// - `symbol` must be non-empty and at most 32 bytes, for the same reason.
    /// - `decimals` must be between 0 and 255.
    /// - `max_supply` must be non-negative (a cap cannot be negative).
    pub fn validate(env: &Env, name: &String, symbol: &String, decimals: u32, max_supply: i128) {
        if name.is_empty() || name.len() > 32 {
            TokenError::InvalidMetadataError.panic(env);
        }
        if symbol.is_empty() || symbol.len() > 32 {
            TokenError::InvalidMetadataError.panic(env);
        }
        if decimals > 255 {
            TokenError::DecimalsError.panic(env);
        }
        if max_supply < 0 {
            TokenError::MaxSupplyError.panic(env);
        }
    }

    /// Validates the metadata, then persists it as the contract's instance
    /// storage. Used during construction to record the token's configuration.
    pub fn save(
        env: &Env,
        admin: Address,
        name: String,
        symbol: String,
        decimals: u32,
        max_supply: i128,
    ) {
        Self::validate(env, &name, &symbol, decimals, max_supply);
        let metadata = TokenMetadata {
            admin,
            name,
            symbol,
            decimals,
            max_supply,
        };
        env.storage().instance().set(&"metadata", &metadata);
    }

    /// Loads the stored metadata. Panics if the contract was never constructed.
    pub fn load(env: &Env) -> TokenMetadata {
        env.storage().instance().get(&"metadata").unwrap()
    }

    /// Returns just the stored admin address.
    pub fn admin(env: &Env) -> Address {
        Self::load(env).admin
    }

    /// Returns just the configured maximum total supply.
    pub fn max_supply(env: &Env) -> i128 {
        Self::load(env).max_supply
    }

    /// Replaces the stored admin with `admin`.
    pub fn set_admin(env: &Env, admin: Address) {
        let mut metadata = Self::load(env);
        metadata.admin = admin;
        env.storage().instance().set(&"metadata", &metadata);
    }
}
