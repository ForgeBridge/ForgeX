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
