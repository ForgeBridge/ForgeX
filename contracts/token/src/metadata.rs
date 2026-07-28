use soroban_sdk::{contracttype, Address, Env, String};

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
    pub fn save(
        env: &Env,
        admin: Address,
        name: String,
        symbol: String,
        decimals: u32,
        max_supply: i128,
    ) {
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
}
