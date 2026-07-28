use soroban_sdk::{contract, contractimpl, Address, Env, String};

#[contract]
pub struct TokenContract;

#[contractimpl]
impl TokenContract {
    pub fn initialize(
        _env: Env,
        _admin: Address,
        _name: String,
        _symbol: String,
        _decimals: u32,
        _max_supply: i128,
    ) {
    }
}
