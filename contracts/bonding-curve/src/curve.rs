use soroban_sdk::{contract, contractimpl, Address, Env};

#[contract]
pub struct BondingCurveContract;

#[contractimpl]
impl BondingCurveContract {
    pub fn initialize(env: Env, _token_id: Address, _curve_params: (), admin: Address) {
        env.storage().instance().set(&"admin", &admin);
    }
}
