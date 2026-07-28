use soroban_sdk::Env;

pub struct Pool;

impl Pool {
    pub fn get_reserve(_env: &Env) -> i128 {
        0
    }
    pub fn set_reserve(_env: &Env, _value: i128) {}
    pub fn get_tokens_sold(_env: &Env) -> i128 {
        0
    }
    pub fn set_tokens_sold(_env: &Env, _value: i128) {}
}
