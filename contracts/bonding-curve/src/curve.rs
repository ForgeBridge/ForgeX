use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol,
};

use crate::math::{calculate_buy_cost, calculate_price, calculate_sell_payout};

/// Parameters of an exponential bonding curve: price grows from
/// `initial_price` with steepness `k` as the number of tokens sold (`S`)
/// increases, per `P(S) = P0 * e^(k*S)`.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct CurveParams {
    /// Price of the first token unit, in 1/SCALE precision.
    pub initial_price: i128,
    /// Exponential growth steepness `k`, in 1/SCALE precision.
    pub steepness: i128,
    /// Target reserve the curve is expected to accumulate. Informational.
    pub reserve_target: i128,
}

/// Current on-chain state of a deployed bonding curve. Returned by
/// [`BondingCurveContract::get_curve_info`].
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct CurveInfo {
    /// Address of the token contract this curve prices.
    pub token_id: Address,
    /// The curve's configuration parameters.
    pub params: CurveParams,
    /// Reserve balance accumulated from buys and depleted by sells.
    pub reserve: i128,
    /// Total number of tokens issued through the curve so far.
    pub tokens_sold: i128,
    /// Current price per token unit, derived from `tokens_sold`.
    pub price: i128,
    /// Current market cap (price * tokens sold), in whole token units.
    pub market_cap: i128,
    /// Admin allowed to manage the curve.
    pub admin: Address,
}

/// A constant-product-free exponential bonding curve. Buyers pay into the
/// reserve to receive newly issued tokens; sellers return tokens and withdraw
/// from the reserve. The price increases as supply grows.
#[contract]
pub struct BondingCurveContract;

const IN_FLIGHT: Symbol = symbol_short!("in_flight");

#[contractimpl]
impl BondingCurveContract {
    /// Configures the curve for a token. Must be called once, by the
    /// deploying account, before any buys or sells.
    pub fn initialize(env: Env, token_id: Address, curve_params: CurveParams, admin: Address) {
        env.storage().instance().set(&"token_id", &token_id);
        env.storage().instance().set(&"curve_params", &curve_params);
        env.storage().instance().set(&"admin", &admin);
        env.storage().persistent().set(&"reserve", &0i128);
        env.storage().persistent().set(&"tokens_sold", &0i128);
    }

    /// Buys `amount_out` tokens for the `buyer`, who must authorize the call.
    ///
    /// Computes the total cost over the price range traversed
    /// (`S -> S + amount_out`), adds it to the reserve, records the newly
    /// issued tokens in `tokens_sold`, and returns the cost paid. The caller
    /// supplies a `max_cost` slippage limit: if the executed cost exceeds it,
    /// the buy is refused and nothing changes. `deadline` is the latest ledger
    /// timestamp (in seconds) at which the order may execute; after it passes
    /// the buy is refused. Panics on a non-positive amount, a supply/reserve
    /// overflow, slippage above `max_cost`, or an expired deadline.
    pub fn buy(env: Env, buyer: Address, amount_out: i128, max_cost: i128, deadline: u64) -> i128 {
        buyer.require_auth();
        if env.ledger().timestamp() > deadline {
            panic!("bonding curve: buy deadline expired");
        }
        Self::enter(&env);
        if amount_out <= 0 {
            panic!("bonding curve: buy amount must be positive");
        }
        let params: CurveParams = env.storage().instance().get(&"curve_params").unwrap();
        let tokens_sold: i128 = env.storage().persistent().get(&"tokens_sold").unwrap();
        let reserve: i128 = env.storage().persistent().get(&"reserve").unwrap();
        let sell_to = tokens_sold
            .checked_add(amount_out)
            .unwrap_or_else(|| panic!("bonding curve: buy supply overflow"));
        let cost = calculate_buy_cost(&params, tokens_sold, sell_to);
        // Slippage protection: refuse if the executed cost exceeds the limit.
        if cost > max_cost {
            panic!("bonding curve: buy cost exceeds slippage limit");
        }
        let new_reserve = reserve
            .checked_add(cost)
            .unwrap_or_else(|| panic!("bonding curve: reserve overflow"));
        let new_tokens_sold = tokens_sold
            .checked_add(amount_out)
            .unwrap_or_else(|| panic!("bonding curve: supply overflow"));
        env.storage().persistent().set(&"reserve", &new_reserve);
        env.storage()
            .persistent()
            .set(&"tokens_sold", &new_tokens_sold);
        let new_price = calculate_price(&params, new_tokens_sold);
        env.events().publish(
            (String::from_str(&env, "Buy"), buyer.clone()),
            (buyer.clone(), amount_out, cost, new_price, new_reserve),
        );
        Self::exit(&env);
        cost
    }

    /// Sells `amount_in` tokens on behalf of the `seller`, who must authorize
    /// the call. Token ownership is expected to be handled by the calling
    /// token before the curve is invoked.
    ///
    /// Computes the payout over the price range traversed
    /// (`S -> S - amount_in`), deducts it from the reserve, records the
    /// returned tokens in `tokens_sold`, and returns the payout received. The
    /// seller supplies a `min_payout` slippage limit: if the executed payout
    /// is below it, the sell is refused and nothing changes. `deadline` is the
    /// latest ledger timestamp (in seconds) at which the order may execute;
    /// after it passes the sell is refused. Panics on a non-positive amount, a
    /// sell exceeding `tokens_sold`, a reserve underflow, slippage below
    /// `min_payout`, or an expired deadline.
    pub fn sell(
        env: Env,
        seller: Address,
        amount_in: i128,
        min_payout: i128,
        deadline: u64,
    ) -> i128 {
        seller.require_auth();
        if env.ledger().timestamp() > deadline {
            panic!("bonding curve: sell deadline expired");
        }
        Self::enter(&env);
        if amount_in <= 0 {
            panic!("bonding curve: sell amount must be positive");
        }
        let params: CurveParams = env.storage().instance().get(&"curve_params").unwrap();
        let tokens_sold: i128 = env.storage().persistent().get(&"tokens_sold").unwrap();
        let reserve: i128 = env.storage().persistent().get(&"reserve").unwrap();
        if amount_in > tokens_sold {
            panic!("bonding curve: sell amount exceeds tokens sold");
        }
        let sold_to = tokens_sold
            .checked_sub(amount_in)
            .unwrap_or_else(|| panic!("bonding curve: sell supply underflow"));
        let payout = calculate_sell_payout(&params, tokens_sold, sold_to);
        // Slippage protection: refuse if the executed payout is below the
        // limit.
        if payout < min_payout {
            panic!("bonding curve: sell payout below slippage limit");
        }
        let new_reserve = reserve
            .checked_sub(payout)
            .unwrap_or_else(|| panic!("bonding curve: reserve underflow"));
        let new_tokens_sold = tokens_sold
            .checked_sub(amount_in)
            .unwrap_or_else(|| panic!("bonding curve: supply underflow"));
        env.storage().persistent().set(&"reserve", &new_reserve);
        env.storage()
            .persistent()
            .set(&"tokens_sold", &new_tokens_sold);
        let new_price = calculate_price(&params, new_tokens_sold);
        env.events().publish(
            (String::from_str(&env, "Sell"), seller.clone()),
            (seller.clone(), amount_in, payout, new_price, new_reserve),
        );
        Self::exit(&env);
        payout
    }

    /// Returns the current price per token unit. Publicly queryable.
    pub fn get_price(env: Env) -> i128 {
        let params: CurveParams = env.storage().instance().get(&"curve_params").unwrap();
        let tokens_sold: i128 = env.storage().persistent().get(&"tokens_sold").unwrap();
        calculate_price(&params, tokens_sold)
    }

    /// Returns the current reserve balance. Publicly queryable.
    pub fn get_reserve(env: Env) -> i128 {
        env.storage().persistent().get(&"reserve").unwrap()
    }

    /// Returns how many tokens have been sold (issued) so far. Publicly
    /// queryable.
    pub fn get_tokens_sold(env: Env) -> i128 {
        env.storage().persistent().get(&"tokens_sold").unwrap()
    }

    /// Returns the current market cap: `price * tokens_sold`, in whole token
    /// units. Publicly queryable.
    pub fn get_market_cap(env: Env) -> i128 {
        let params: CurveParams = env.storage().instance().get(&"curve_params").unwrap();
        let tokens_sold: i128 = env.storage().persistent().get(&"tokens_sold").unwrap();
        let price = calculate_price(&params, tokens_sold);
        price
            .checked_mul(tokens_sold)
            .unwrap_or_else(|| panic!("bonding curve: market cap overflow"))
            / 10_000_000
    }

    /// Returns a snapshot of the curve's full state: token, params, reserve,
    /// tokens sold, price, market cap, and admin. Publicly queryable.
    pub fn get_curve_info(env: Env) -> CurveInfo {
        let token_id: Address = env.storage().instance().get(&"token_id").unwrap();
        let params: CurveParams = env.storage().instance().get(&"curve_params").unwrap();
        let reserve: i128 = env.storage().persistent().get(&"reserve").unwrap();
        let tokens_sold: i128 = env.storage().persistent().get(&"tokens_sold").unwrap();
        let admin: Address = env.storage().instance().get(&"admin").unwrap();
        let price = calculate_price(&params, tokens_sold);
        let market_cap = price
            .checked_mul(tokens_sold)
            .unwrap_or_else(|| panic!("bonding curve: market cap overflow"))
            / 10_000_000;
        CurveInfo {
            token_id,
            params,
            reserve,
            tokens_sold,
            price,
            market_cap,
            admin,
        }
    }
}

impl BondingCurveContract {
    /// Raises the reentrancy flag, refusing entry if the guard is already up.
    fn enter(env: &Env) {
        let in_flight: bool = env.storage().persistent().get(&IN_FLIGHT).unwrap_or(false);
        if in_flight {
            panic!("bonding curve: reentrancy guard triggered");
        }
        env.storage().persistent().set(&IN_FLIGHT, &true);
    }

    /// Clears the reentrancy flag once a liquidity operation completes.
    fn exit(env: &Env) {
        env.storage().persistent().set(&IN_FLIGHT, &false);
    }
}
