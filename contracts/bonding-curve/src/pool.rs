use soroban_sdk::{contracttype, Address, Env};

#[contracttype]
pub struct PoolStorage {
    pub reserve: i128,
    pub tokens_sold: i128,
}

pub struct Pool;

impl Pool {
    pub fn get_reserve(env: &Env) -> i128 {
        env.storage().persistent().get(&"reserve").unwrap_or(0)
    }

    pub fn set_reserve(env: &Env, value: i128) {
        env.storage().persistent().set(&"reserve", &value);
    }

    pub fn get_tokens_sold(env: &Env) -> i128 {
        env.storage().persistent().get(&"tokens_sold").unwrap_or(0)
    }

    pub fn set_tokens_sold(env: &Env, value: i128) {
        env.storage().persistent().set(&"tokens_sold", &value);
    }
}