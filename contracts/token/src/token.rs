use soroban_sdk::{contract, contractimpl, Address, Env, String, Symbol};

use crate::metadata::TokenMetadata;

#[contract]
pub struct TokenContract;

#[contractimpl]
impl TokenContract {
    pub fn initialize(
        env: Env,
        admin: Address,
        name: String,
        symbol: String,
        decimals: u32,
        max_supply: i128,
    ) {
        TokenMetadata::save(&env, admin, name, symbol, decimals, max_supply);
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin = TokenMetadata::admin(&env);
        admin.require_auth();
        to.require_auth();
        TokenContract::mint_unchecked(&env, to, amount);
    }

    pub fn burn(env: Env, from: Address, amount: i128) {
        let admin = TokenMetadata::admin(&env);
        admin.require_auth();
        TokenContract::burn_unchecked(&env, from, amount);
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        TokenContract::transfer_unchecked(&env, from, to, amount);
    }

    pub fn balance_of(env: Env, id: Address) -> i128 {
        TokenContract::read_balance(&env, &id)
    }

    pub fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration: u64) {
        from.require_auth();
        TokenContract::write_allowance(&env, &from, &spender, amount, expiration);
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        TokenContract::read_allowance(&env, &from, &spender)
    }

    pub fn metadata(env: Env) -> TokenMetadata {
        TokenMetadata::load(&env)
    }
}

impl TokenContract {
    pub fn mint_unchecked(env: &Env, to: Address, amount: i128) {
        let mut supply = Self::read_total_supply(env);
        let max_supply = TokenMetadata::max_supply(env);
        supply += amount;
        if supply > max_supply {
            panic!("total supply exceeds max supply");
        }
        Self::write_total_supply(env, supply);
        Self::receive_balance(env, &to, amount);
        env.events().publish(
            (Symbol::new(env, "mint"), to.clone()),
            (to, amount),
        );
    }

    pub fn burn_unchecked(env: &Env, from: Address, amount: i128) {
        Self::spend_balance(env, &from, amount);
        let supply = Self::read_total_supply(env) - amount;
        Self::write_total_supply(env, supply);
        env.events().publish(
            (Symbol::new(env, "burn"), from.clone()),
            (from, amount),
        );
    }

    pub fn transfer_unchecked(env: &Env, from: Address, to: Address, amount: i128) {
        Self::spend_balance(env, &from, amount);
        Self::receive_balance(env, &to, amount);
        env.events().publish(
            (Symbol::new(env, "transfer"), from.clone()),
            (from, to, amount),
        );
    }

    pub fn read_balance(env: &Env, addr: &Address) -> i128 {
        env.storage().persistent().get(&addr).unwrap_or(0)
    }

    fn write_balance(env: &Env, addr: &Address, amount: i128) {
        env.storage().persistent().set(addr, &amount);
    }

    fn receive_balance(env: &Env, addr: &Address, amount: i128) {
        let balance = Self::read_balance(env, addr);
        Self::write_balance(env, addr, balance + amount);
    }

    fn spend_balance(env: &Env, addr: &Address, amount: i128) {
        let balance = Self::read_balance(env, addr);
        if balance < amount {
            panic!("insufficient balance");
        }
        Self::write_balance(env, addr, balance - amount);
    }

    pub fn read_total_supply(env: &Env) -> i128 {
        env.storage().persistent().get(&Symbol::new(env, "total_supply")).unwrap_or(0)
    }

    pub fn write_total_supply(env: &Env, amount: i128) {
        env.storage().persistent().set(&Symbol::new(env, "total_supply"), &amount);
    }

    pub fn read_allowance(env: &Env, from: &Address, spender: &Address) -> i128 {
        let key = (from.clone(), spender.clone());
        env.storage().persistent().get(&key).unwrap_or(0)
    }

    pub fn write_allowance(env: &Env, from: &Address, spender: &Address, amount: i128, _expiration: u64) {
        let key = (from.clone(), spender.clone());
        env.storage().persistent().set(&key, &amount);
    }
}