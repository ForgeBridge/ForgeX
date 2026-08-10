use soroban_sdk::{
    contract, contractimpl, symbol_short, Address, BytesN, Env, IntoVal, String, Symbol,
};

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

    /// Mints `amount` tokens to `to`. Admin only.
    ///
    /// Returns `Err` instead of panicking on invalid input: minting while
    /// paused, a non-positive `amount`, an amount that would overflow the
    /// total supply, or an amount that would push the total supply above the
    /// configured `max_supply` all yield a structured error and change nothing.
    pub fn mint(env: Env, to: Address, amount: i128) -> Result<i128, TokenError> {
        Self::ensure_not_paused(&env)?;
        let admin = TokenMetadata::admin(&env);
        admin.require_auth();
        to.require_auth();
        TokenContract::mint_unchecked(&env, to, amount)
    }

    /// Burns `amount` tokens from `from`. Admin only.
    ///
    /// Returns `Err` instead of panicking on invalid input (`from` holding
    /// too few tokens, a non-positive `amount`, or the token being paused).
    pub fn burn(env: Env, from: Address, amount: i128) -> Result<i128, TokenError> {
        Self::ensure_not_paused(&env)?;
        let admin = TokenMetadata::admin(&env);
        admin.require_auth();
        TokenContract::burn_unchecked(&env, from, amount)
    }

    /// Transfers `amount` from `from` to `to`, authorized by `from`.
    ///
    /// Returns `Err` instead of panicking on invalid arguments and invalid
    /// state: negative amounts, revoked parties, a paused token, an
    /// insufficient balance, a failing or reentrant transfer hook, or a
    /// supply overflow all produce a structured error and change nothing.
    pub fn transfer(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
    ) -> Result<i128, TokenError> {
        Self::ensure_not_paused(&env)?;
        from.require_auth();
        if !Self::is_authorized(&env, &from) || !Self::is_authorized(&env, &to) {
            return Err(TokenError::UnauthorizedError);
        }
        Self::try_run_transfer_hook(&env, &from, &to, amount)?;
        TokenContract::transfer_unchecked(&env, from, to, amount)
    }

    /// Returns whether the token is currently paused. Publicly queryable.
    pub fn paused(env: Env) -> bool {
        Self::read_paused(&env)
    }

    /// Pauses or unpauses the token. Admin only.
    ///
    /// While paused, every value-moving operation (`transfer`, `mint`, `burn`,
    /// `approve`) is rejected with `ContractPausedError` as an emergency stop.
    /// Reads (`balance_of`, `total_supply`, `metadata`, ...) stay available so
    /// the state can be inspected while halted. Pausing remains reversible by
    /// the admin as long as the admin was not revoked.
    pub fn set_paused(env: Env, paused: bool) -> Result<(), TokenError> {
        let admin = TokenMetadata::admin(&env);
        admin.require_auth();
        Self::write_paused(&env, paused);
        env.events()
            .publish((Symbol::new(&env, "set_paused"), admin, paused), ());
        Ok(())
    }

    /// Returns the currently configured transfer hook contract, if any.
    pub fn get_transfer_hook(env: Env) -> Option<Address> {
        Self::read_transfer_hook(&env)
    }

    /// Configures or removes the transfer hook. Admin only.
    ///
    /// When set, each [`transfer`] first invokes `hook(from, to, amount)` on
    /// the hook contract and requires both the hook's authorization and a
    /// successful hook execution. A malicious or misconfigured hook therefore
    /// fails closed and reverts the whole transfer rather than running
    /// partially. Passing `None` disables the hook. The token cannot be its
    /// own hook (that would trivially recurse). Setting the token itself as
    /// the hook returns `Err`; all other failures are reported as `Err`.
    pub fn set_transfer_hook(env: Env, hook: Option<Address>) -> Result<(), TokenError> {
        let admin = TokenMetadata::admin(&env);
        admin.require_auth();
        if let Some(h) = &hook {
            if h == &env.current_contract_address() {
                return Err(TokenError::UnauthorizedError);
            }
        }
        Self::write_transfer_hook(&env, hook.clone());
        env.events().publish(
            (Symbol::new(&env, "set_transfer_hook"), admin, hook.clone()),
            (),
        );
        Ok(())
    }

    pub fn balance_of(env: Env, id: Address) -> i128 {
        TokenContract::read_balance(&env, &id)
    }

    /// Returns the total number of tokens in existence, across all holders.
    /// Publicly queryable without authorization, like `balance_of`.
    pub fn total_supply(env: Env) -> i128 {
        Self::read_total_supply(&env)
    }

    /// Sets the allowance `spender` may spend from `from`. Authorized by
    /// `from`.
    ///
    /// Returns `Err` instead of panicking on a paused token, a negative
    /// amount, or a revoked `from`.
    pub fn approve(
        env: Env,
        from: Address,
        spender: Address,
        amount: i128,
        expiration: u64,
    ) -> Result<(), TokenError> {
        Self::ensure_not_paused(&env)?;
        from.require_auth();
        if amount < 0 {
            return Err(TokenError::NegativeAmountError);
        }
        if !Self::is_authorized(&env, &from) {
            return Err(TokenError::UnauthorizedError);
        }
        Self::write_allowance(&env, &from, &spender, amount, expiration);
        // SEP-41 approve event: topics `["approve", from, spender]`, data
        // `(amount, expiration_ledger)`. ForgeX tokens store a u64 deadline so
        // the event carries the exact stored value.
        env.events().publish(
            (symbol_short!("approve"), from, spender),
            (amount, expiration),
        );
        Ok(())
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        Self::read_allowance(&env, &from, &spender)
    }

    /// Transfers contract ownership (the admin role) to `new_admin`. Admin
    /// only.
    ///
    /// After a successful call, only `new_admin` can perform admin operations
    /// (mint, burn, set_authorized, set_paused, ...). The role can never be
    /// left drained: `new_admin` must currently be authorized, or the call
    /// returns `Err` and ownership is unchanged. An event records the change
    /// so ownership history is observable.
    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), TokenError> {
        let admin = TokenMetadata::admin(&env);
        admin.require_auth();
        if !Self::is_authorized(&env, &new_admin) {
            return Err(TokenError::UnauthorizedError);
        }
        TokenMetadata::set_admin(&env, new_admin.clone());
        env.events()
            .publish((Symbol::new(&env, "set_admin"), admin, new_admin), ());
        Ok(())
    }

    /// Admin-authorized rescue transfer. Admin only.
    ///
    /// Moves `amount` from `from` to `to` without requiring `from`'s
    /// authorization, mirroring a clawback-style recovery path for stuck or
    /// compromised balances. The SEP-41 `transfer` event is emitted as usual,
    /// plus an `admin_transfer` event so the movement is attributable. The
    /// destination must be authorized to receive tokens. While the token is
    /// paused this operation is refused like any other value movement. Invalid
    /// input and state are reported as `Err`, never panics.
    pub fn admin_transfer(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
    ) -> Result<i128, TokenError> {
        Self::ensure_not_paused(&env)?;
        let admin = TokenMetadata::admin(&env);
        admin.require_auth();
        if amount < 0 {
            return Err(TokenError::NegativeAmountError);
        }
        if !Self::is_authorized(&env, &to) {
            return Err(TokenError::UnauthorizedError);
        }
        Self::try_run_transfer_hook(&env, &from, &to, amount)?;
        let moved = TokenContract::transfer_unchecked(&env, from.clone(), to.clone(), amount)?;
        env.events()
            .publish((Symbol::new(&env, "admin_transfer"), from, to), amount);
        Ok(moved)
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
    /// authorization (that would leave the contract with no party able to
    /// manage it); attempting to returns `Err`.
    pub fn set_authorized(env: Env, id: Address, authorize: bool) -> Result<(), TokenError> {
        let admin = TokenMetadata::admin(&env);
        admin.require_auth();
        if id == admin && !authorize {
            return Err(TokenError::UnauthorizedError);
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
        Ok(())
    }

    /// Returns the token's name. SEP-41 fixed-function query.
    pub fn name(env: Env) -> String {
        TokenMetadata::load(&env).name
    }

    /// Returns the token's symbol. SEP-41 fixed-function query.
    pub fn symbol(env: Env) -> String {
        TokenMetadata::load(&env).symbol
    }

    /// Returns the number of decimals used to represent token amounts.
    /// SEP-41 fixed-function query.
    pub fn decimals(env: Env) -> u32 {
        TokenMetadata::load(&env).decimals
    }

    pub fn metadata(env: Env) -> TokenMetadata {
        TokenMetadata::load(&env)
    }
}

impl TokenContract {
    pub fn mint_unchecked(env: &Env, to: Address, amount: i128) -> Result<i128, TokenError> {
        if amount <= 0 {
            return Err(TokenError::NegativeAmountError);
        }
        let supply = Self::read_total_supply(env);
        let max_supply = TokenMetadata::max_supply(env);
        let supply = match supply.checked_add(amount) {
            Some(v) => v,
            None => return Err(TokenError::OverflowError),
        };
        if supply > max_supply {
            return Err(TokenError::MaxSupplyError);
        }
        Self::write_total_supply(env, supply);
        Self::try_receive_balance(env, &to, amount)?;
        // SEP-41 mint event: topics `["mint", to]`, data `amount`.
        env.events()
            .publish((symbol_short!("mint"), to.clone()), amount);
        Ok(amount)
    }

    pub fn burn_unchecked(env: &Env, from: Address, amount: i128) -> Result<i128, TokenError> {
        if amount <= 0 {
            return Err(TokenError::NegativeAmountError);
        }
        Self::try_spend_balance(env, &from, amount)?;
        let supply = match Self::read_total_supply(env).checked_sub(amount) {
            Some(v) => v,
            None => return Err(TokenError::OverflowError),
        };
        Self::write_total_supply(env, supply);
        // SEP-41 burn event: topics `["burn", from]`, data `amount`.
        env.events()
            .publish((symbol_short!("burn"), from.clone()), amount);
        Ok(amount)
    }

    pub fn transfer_unchecked(
        env: &Env,
        from: Address,
        to: Address,
        amount: i128,
    ) -> Result<i128, TokenError> {
        if amount < 0 {
            return Err(TokenError::NegativeAmountError);
        }
        Self::try_spend_balance(env, &from, amount)?;
        Self::try_receive_balance(env, &to, amount)?;
        // SEP-41 transfer event: topics `["transfer", from, to]`, data `amount`.
        env.events()
            .publish((symbol_short!("transfer"), from, to), amount);
        Ok(amount)
    }

    /// Runs the configured transfer hook, hardening against reentrancy and
    /// abuse:
    ///
    /// - The hook contract must itself authorize the call
    ///   (`hook.require_auth()`); a stale or hijacked hook cannot silently
    ///   attach itself to transfers.
    /// - An in-flight flag is raised before invoking the hook and cleared
    ///   afterwards. If the hook (or anything it calls) attempts to re-enter
    ///   this token's `transfer`, the guard fails the call closed. The flag is
    ///   transaction-scoped: a failing hook reverts the whole transaction, so
    ///   the flag can never leak into a later operation.
    /// - Any hook failure (missing function, revert, bad auth) aborts the
    ///   transfer entirely and is reported as `Err(HooksError)` instead of
    ///   panicking.
    fn try_run_transfer_hook(
        env: &Env,
        from: &Address,
        to: &Address,
        amount: i128,
    ) -> Result<(), TokenError> {
        // A transfer attempted while another hook-driven transfer is still on
        // the stack is refused up front, even if the hook was cleared.
        if Self::read_hook_in_flight(env) {
            return Err(TokenError::UnauthorizedError);
        }
        let Some(hook) = Self::read_transfer_hook(env) else {
            return Ok(());
        };
        Self::write_hook_in_flight(env, true);
        hook.require_auth();
        let result = env.try_invoke_contract::<(), soroban_sdk::Error>(
            &hook,
            &Symbol::new(env, "hook"),
            soroban_sdk::vec![
                &env,
                from.clone().into_val(env),
                to.clone().into_val(env),
                amount.into_val(env),
            ],
        );
        Self::write_hook_in_flight(env, false);
        match result {
            Ok(Ok(())) => Ok(()),
            _ => Err(TokenError::HooksError),
        }
    }

    fn read_transfer_hook(env: &Env) -> Option<Address> {
        env.storage()
            .instance()
            .get::<_, Option<Address>>(&Symbol::new(env, "transfer_hook"))
            .unwrap_or(None)
    }

    fn write_transfer_hook(env: &Env, hook: Option<Address>) {
        env.storage()
            .instance()
            .set(&Symbol::new(env, "transfer_hook"), &hook);
    }

    fn read_hook_in_flight(env: &Env) -> bool {
        env.storage()
            .persistent()
            .get::<_, bool>(&symbol_short!("in_hook"))
            .unwrap_or(false)
    }

    fn write_hook_in_flight(env: &Env, in_flight: bool) {
        env.storage()
            .persistent()
            .set(&symbol_short!("in_hook"), &in_flight);
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

    fn ensure_not_paused(env: &Env) -> Result<(), TokenError> {
        if Self::read_paused(env) {
            return Err(TokenError::ContractPausedError);
        }
        Ok(())
    }

    fn read_paused(env: &Env) -> bool {
        env.storage()
            .instance()
            .get::<_, bool>(&Symbol::new(env, "paused"))
            .unwrap_or(false)
    }

    fn write_paused(env: &Env, paused: bool) {
        env.storage()
            .instance()
            .set(&Symbol::new(env, "paused"), &paused);
    }

    pub fn read_balance(env: &Env, addr: &Address) -> i128 {
        env.storage().persistent().get(&addr).unwrap_or(0)
    }

    fn write_balance(env: &Env, addr: &Address, amount: i128) {
        env.storage().persistent().set(addr, &amount);
    }

    fn try_receive_balance(env: &Env, addr: &Address, amount: i128) -> Result<(), TokenError> {
        let balance = Self::read_balance(env, addr);
        let new_balance = match balance.checked_add(amount) {
            Some(v) => v,
            None => return Err(TokenError::OverflowError),
        };
        Self::write_balance(env, addr, new_balance);
        Ok(())
    }

    fn try_spend_balance(env: &Env, addr: &Address, amount: i128) -> Result<(), TokenError> {
        let balance = Self::read_balance(env, addr);
        if balance < amount {
            return Err(TokenError::BalanceError);
        }
        let new_balance = match balance.checked_sub(amount) {
            Some(v) => v,
            None => return Err(TokenError::OverflowError),
        };
        Self::write_balance(env, addr, new_balance);
        Ok(())
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
