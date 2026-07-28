use soroban_sdk::{contract, contractimpl, Address, Env};

#[contract]
pub struct FactoryContract;

#[contractimpl]
impl FactoryContract {
    pub fn initialize(env: Env, admin: Address) {
        env.storage().instance().set(&"admin", &admin);
    }
}
