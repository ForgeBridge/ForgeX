use soroban_sdk::{contracttype, Address, Env, String};

use crate::error::TokenError;

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct TokenMetadata {
    pub admin: Address,
    pub name: String,
    pub symbol: String,
    pub decimals: u32,
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

    pub fn load(env: &Env) -> TokenMetadata {
        env.storage().instance().get(&"metadata").unwrap()
    }

    pub fn admin(env: &Env) -> Address {
        Self::load(env).admin
    }

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
