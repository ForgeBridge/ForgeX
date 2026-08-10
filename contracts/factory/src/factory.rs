use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct CurveParams {
    pub initial_price: i128,
    pub steepness: i128,
    pub reserve_target: i128,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct CreateTokenParams {
    pub name: String,
    pub symbol: String,
    pub decimals: u32,
    pub max_supply: i128,
    pub image_uri: String,
    pub description: String,
    pub curve_params: CurveParams,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct TokenInfo {
    pub token_id: Address,
    pub curve_id: Address,
    pub creator: Address,
    pub name: String,
    pub symbol: String,
    pub decimals: u32,
    pub max_supply: i128,
    pub image_uri: String,
    pub description: String,
    pub created_at: u64,
}

#[contract]
pub struct FactoryContract;

#[contractimpl]
impl FactoryContract {
    pub fn initialize(env: Env, admin: Address) {
        env.storage().instance().set(&"admin", &admin);
    }

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
        Registry::push(&env, info);
        env.events().publish(
            (String::from_str(&env, "TokenCreated"), token_id.clone()),
            (token_id.clone(), curve_id.clone()),
        );
        (token_id, curve_id)
    }

    pub fn get_all_tokens(env: Env) -> Vec<TokenInfo> {
        Registry::all(&env)
    }

    pub fn get_token(env: Env, token_id: Address) -> TokenInfo {
        Registry::get(&env, token_id)
    }

    pub fn get_token_count(env: Env) -> u64 {
        Registry::count(&env)
    }

    pub fn get_tokens_paginated(env: Env, offset: u64, limit: u64) -> Vec<TokenInfo> {
        Registry::paginated(&env, offset, limit)
    }
}

pub struct Registry;

impl Registry {
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

    pub fn all(env: &Env) -> Vec<TokenInfo> {
        env.storage()
            .persistent()
            .get(&"tokens")
            .unwrap_or(Vec::new(env))
    }

    pub fn get(env: &Env, token_id: Address) -> TokenInfo {
        let tokens = Self::all(env);
        tokens
            .into_iter()
            .find(|t| t.token_id == token_id)
            .expect("token not found")
    }

    pub fn count(env: &Env) -> u64 {
        env.storage().persistent().get(&"count").unwrap_or(0)
    }

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
