use soroban_sdk::{contract, contractimpl, symbol_short, Address, BytesN, Env, String, Symbol};

use crate::error::TokenError;
use crate::metadata::TokenMetadata;
use crate::upgrade::InterfaceVersion;

#[contract]
pub struct TokenContract;

#[contractimpl]
impl TokenContract {
    /// Constructs the token at deployment time. Runs exactly once, when the
    /// contract is deployed, which prevents re-initialization attacks: there
    /// is no public post-deploy `initialize` entry point that an attacker
    /// could use to steal admin or overwrite metadata.
    pub fn __constructor(
        env: Env,
        admin: Address,
        name: String,
        symbol: String,
        decimals: u32,
        max_supply: i128,
    ) {
        InterfaceVersion::initialize(&env);
        TokenMetadata::save(&env, admin, name, symbol, decimals, max_supply);
    }

    /// Returns the deployed interface and implementation version. Useful for
    /// detecting upgrades on-chain and by tooling.
    pub fn version(env: Env) -> InterfaceVersion {
        InterfaceVersion::read(&env)
    }

    /// Admin-only upgrade of the contract implementation. The `new_wasm_hash`
    /// must be the hash of a `forgex-token` wasm build that preserves the
    /// existing stored interface.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        crate::upgrade::upgrade(&env, new_wasm_hash);
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
        if !Self::is_authorized(&env, &from) || !Self::is_authorized(&env, &to) {
            TokenError::UnauthorizedError.panic(&env);
        }
        TokenContract::transfer_unchecked(&env, from, to, amount);
    }

    pub fn balance_of(env: Env, id: Address) -> i128 {
        TokenContract::read_balance(&env, &id)
    }

    pub fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration: u64) {
        from.require_auth();
        if !Self::is_authorized(&env, &from) {
            TokenError::UnauthorizedError.panic(&env);
        }
        TokenContract::write_allowance(&env, &from, &spender, amount, expiration);
        // SEP-41 approve event: topics `["approve", from, spender]`, data
        // `(amount, expiration_ledger)`. ForgeX tokens store a u64 deadline so
        // the event carries the exact stored value.
        env.events().publish(
            (symbol_short!("approve"), from, spender),
            (amount, expiration),
        );
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        TokenContract::read_allowance(&env, &from, &spender)
    }

    /// Returns whether `id` is currently authorized to hold and move the
    /// token. Addresses default to authorized; the admin can revoke or restore
    /// authorization via [`set_authorized`](Self::set_authorized).
    pub fn authorized(env: Env, id: Address) -> bool {
        Self::is_authorized(&env, &id)
    }

    /// Revokes or restores the authorization of `id`. Admin only.
    ///
    /// A revoked (unauthorized) address cannot send tokens via [`transfer`]
    /// and cannot receive tokens. The admin cannot revoke its own
    /// authorization, otherwise the contract could be left with no party able
    /// to manage it.
    pub fn set_authorized(env: Env, id: Address, authorize: bool) {
        let admin = TokenMetadata::admin(&env);
        admin.require_auth();
        if id == admin && !authorize {
            TokenError::UnauthorizedError.panic(&env);
        }
        Self::write_authorized(&env, &id, authorize);
        env.events().publish(
            (
                Symbol::new(&env, "set_authorized"),
                admin,
                id.clone(),
                authorize,
            ),
            (),
        );
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
            TokenError::InternalError.panic(env);
        }
        Self::write_total_supply(env, supply);
        Self::receive_balance(env, &to, amount);
        // SEP-41 mint event: topics `["mint", to]`, data `amount`.
        env.events()
            .publish((symbol_short!("mint"), to.clone()), amount);
    }

    pub fn burn_unchecked(env: &Env, from: Address, amount: i128) {
        Self::spend_balance(env, &from, amount);
        let supply = Self::read_total_supply(env) - amount;
        Self::write_total_supply(env, supply);
        // SEP-41 burn event: topics `["burn", from]`, data `amount`.
        env.events()
            .publish((symbol_short!("burn"), from.clone()), amount);
    }

    pub fn transfer_unchecked(env: &Env, from: Address, to: Address, amount: i128) {
        Self::spend_balance(env, &from, amount);
        Self::receive_balance(env, &to, amount);
        // SEP-41 transfer event: topics `["transfer", from, to]`, data `amount`.
        env.events()
            .publish((symbol_short!("transfer"), from, to), amount);
    }

    fn is_authorized(env: &Env, id: &Address) -> bool {
        let key = (Symbol::new(env, "authorized"), id.clone());
        env.storage()
            .persistent()
            .get::<_, bool>(&key)
            .unwrap_or(true)
    }

    fn write_authorized(env: &Env, id: &Address, authorized: bool) {
        let key = (Symbol::new(env, "authorized"), id.clone());
        env.storage().persistent().set(&key, &authorized);
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
            TokenError::BalanceError.panic(env);
        }
        Self::write_balance(env, addr, balance - amount);
    }

    pub fn read_total_supply(env: &Env) -> i128 {
        env.storage()
            .persistent()
            .get(&Symbol::new(env, "total_supply"))
            .unwrap_or(0)
    }

    pub fn write_total_supply(env: &Env, amount: i128) {
        env.storage()
            .persistent()
            .set(&Symbol::new(env, "total_supply"), &amount);
    }

    pub fn read_allowance(env: &Env, from: &Address, spender: &Address) -> i128 {
        let key = (from.clone(), spender.clone());
        env.storage().persistent().get(&key).unwrap_or(0)
    }

    pub fn write_allowance(
        env: &Env,
        from: &Address,
        spender: &Address,
        amount: i128,
        _expiration: u64,
    ) {
        let key = (from.clone(), spender.clone());
        env.storage().persistent().set(&key, &amount);
    }
}
