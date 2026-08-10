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
    /// Current fee rate in basis points.
    pub fee_rate: i128,
    /// Maximum tokens that can be sold.
    pub cap: i128,
    /// Whether the curve has graduated (reached cap).
    pub graduated: bool,
    /// Accumulated admin fees not yet withdrawn.
    pub admin_fees: i128,
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
        env.storage().instance().set(&"fee_rate", &0i128);
        env.storage().instance().set(&"min_buy", &0i128);
        env.storage().instance().set(&"max_buy", &i128::MAX);
        env.storage().instance().set(&"min_sell", &0i128);
        env.storage().instance().set(&"max_sell", &i128::MAX);
        env.storage().instance().set(&"cap", &i128::MAX);
        env.storage().instance().set(&"graduated", &false);
        env.storage().persistent().set(&"reserve", &0i128);
        env.storage().persistent().set(&"tokens_sold", &0i128);
        env.storage().persistent().set(&"admin_fees", &0i128);
    }

    /// Buys `amount_out` tokens for the `buyer`, who must authorize the call.
    ///
    /// Computes the total cost over the price range traversed
    /// (`S -> S + amount_out`), adds it to the reserve while routing the
    /// admin fee to `admin_fees`, records the newly issued tokens in
    /// `tokens_sold`, and returns the full amount owed (`cost + fee`). The
    /// caller supplies a `max_cost` slippage limit: if the total owed exceeds
    /// it, the buy is refused and nothing changes. `deadline` is the latest
    /// ledger timestamp (in seconds) at which the order may execute; after it
    /// passes the buy is refused. Panics on a non-positive amount, a
    /// supply/reserve overflow, slippage above `max_cost`, an expired
    /// deadline, a buy size outside min/max limits, or if the buy would exceed
    /// the curve cap.
    pub fn buy(env: Env, buyer: Address, amount_out: i128, max_cost: i128, deadline: u64) -> i128 {
        buyer.require_auth();
        if env.ledger().timestamp() > deadline {
            panic!("bonding curve: buy deadline expired");
        }
        Self::enter(&env);
        if amount_out <= 0 {
            panic!("bonding curve: buy amount must be positive");
        }
        let min_buy: i128 = env.storage().instance().get(&"min_buy").unwrap_or(0);
        let max_buy: i128 = env.storage().instance().get(&"max_buy").unwrap_or(i128::MAX);
        if amount_out < min_buy {
            panic!("bonding curve: buy amount below minimum");
        }
        if amount_out > max_buy {
            panic!("bonding curve: buy amount exceeds maximum");
        }
        let cap: i128 = env.storage().instance().get(&"cap").unwrap_or(i128::MAX);
        let tokens_sold: i128 = env.storage().persistent().get(&"tokens_sold").unwrap();
        let new_tokens_sold = tokens_sold
            .checked_add(amount_out)
            .unwrap_or_else(|| panic!("bonding curve: buy supply overflow"));
        if new_tokens_sold > cap {
            panic!("bonding curve: buy would exceed curve cap");
        }
        let params: CurveParams = env.storage().instance().get(&"curve_params").unwrap();
        let fee_rate: i128 = env.storage().instance().get(&"fee_rate").unwrap_or(0);
        let reserve: i128 = env.storage().persistent().get(&"reserve").unwrap();
        let admin_fees: i128 = env.storage().persistent().get(&"admin_fees").unwrap();
        let sell_to = tokens_sold
            .checked_add(amount_out)
            .unwrap_or_else(|| panic!("bonding curve: buy supply overflow"));
        let cost = calculate_buy_cost(&params, tokens_sold, sell_to);
        let fee = cost
            .checked_mul(fee_rate)
            .unwrap_or_else(|| panic!("bonding curve: fee overflow"))
            / 10_000;
        let owed = cost
            .checked_add(fee)
            .unwrap_or_else(|| panic!("bonding curve: fee overflow"));
        // Slippage protection: refuse if the total amount owed (cost + fee)
        // exceeds the limit.
        if owed > max_cost {
            panic!("bonding curve: buy cost exceeds slippage limit");
        }
        let new_reserve = reserve
            .checked_add(cost)
            .unwrap_or_else(|| panic!("bonding curve: reserve overflow"));
        let new_admin_fees = admin_fees
            .checked_add(fee)
            .unwrap_or_else(|| panic!("bonding curve: fee overflow"));
        env.storage().persistent().set(&"reserve", &new_reserve);
        env.storage()
            .persistent()
            .set(&"tokens_sold", &new_tokens_sold);
        env.storage()
            .persistent()
            .set(&"admin_fees", &new_admin_fees);
        // If we've reached the cap, mark as graduated
        if new_tokens_sold >= cap {
            env.storage().instance().set(&"graduated", &true);
        }
        let new_price = calculate_price(&params, new_tokens_sold);
        env.events().publish(
            (String::from_str(&env, "Buy"), buyer.clone()),
            (
                buyer.clone(),
                amount_out,
                cost,
                fee,
                new_price,
                new_reserve,
                new_admin_fees,
            ),
        );
        Self::exit(&env);
        owed
    }

    /// Sells `amount_in` tokens on behalf of the `seller`, who must authorize
    /// the call. Token ownership is expected to be handled by the calling
    /// token before the curve is invoked.
    ///
    /// Computes the payout over the price range traversed
    /// (`S -> S - amount_in`), deducts it from the reserve while routing the
    /// admin fee to `admin_fees`, records the returned tokens in
    /// `tokens_sold`, and returns the net proceeds (`payout - fee`). The
    /// seller supplies a `min_payout` slippage limit: if the net proceeds fall
    /// below it, the sell is refused and nothing changes. `deadline` is the
    /// latest ledger timestamp (in seconds) at which the order may execute;
    /// after it passes the sell is refused. Panics on a non-positive amount, a
    /// sell exceeding `tokens_sold`, a reserve underflow, slippage below
    /// `min_payout`, an expired deadline, or a sell size outside min/max limits.
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
        let min_sell: i128 = env.storage().instance().get(&"min_sell").unwrap_or(0);
        let max_sell: i128 = env.storage().instance().get(&"max_sell").unwrap_or(i128::MAX);
        if amount_in < min_sell {
            panic!("bonding curve: sell amount below minimum");
        }
        if amount_in > max_sell {
            panic!("bonding curve: sell amount exceeds maximum");
        }
        let params: CurveParams = env.storage().instance().get(&"curve_params").unwrap();
        let fee_rate: i128 = env.storage().instance().get(&"fee_rate").unwrap_or(0);
        let tokens_sold: i128 = env.storage().persistent().get(&"tokens_sold").unwrap();
        let reserve: i128 = env.storage().persistent().get(&"reserve").unwrap();
        let admin_fees: i128 = env.storage().persistent().get(&"admin_fees").unwrap();
        if amount_in > tokens_sold {
            panic!("bonding curve: sell amount exceeds tokens sold");
        }
        let sold_to = tokens_sold
            .checked_sub(amount_in)
            .unwrap_or_else(|| panic!("bonding curve: sell supply underflow"));
        let payout = calculate_sell_payout(&params, tokens_sold, sold_to);
        let fee = payout
            .checked_mul(fee_rate)
            .unwrap_or_else(|| panic!("bonding curve: fee overflow"))
            / 10_000;
        let net = payout
            .checked_sub(fee)
            .unwrap_or_else(|| panic!("bonding curve: fee underflow"));
        // Slippage protection: refuse if the net proceeds fall below the
        // limit.
        if net < min_payout {
            panic!("bonding curve: sell payout below slippage limit");
        }
        let new_reserve = reserve
            .checked_sub(payout)
            .unwrap_or_else(|| panic!("bonding curve: reserve underflow"));
        let new_tokens_sold = tokens_sold
            .checked_sub(amount_in)
            .unwrap_or_else(|| panic!("bonding curve: supply underflow"));
        let new_admin_fees = admin_fees
            .checked_add(fee)
            .unwrap_or_else(|| panic!("bonding curve: fee overflow"));
        env.storage().persistent().set(&"reserve", &new_reserve);
        env.storage()
            .persistent()
            .set(&"tokens_sold", &new_tokens_sold);
        env.storage()
            .persistent()
            .set(&"admin_fees", &new_admin_fees);
        let new_price = calculate_price(&params, new_tokens_sold);
        env.events().publish(
            (String::from_str(&env, "Sell"), seller.clone()),
            (
                seller.clone(),
                amount_in,
                payout,
                fee,
                new_price,
                new_reserve,
                new_admin_fees,
            ),
        );
        Self::exit(&env);
        net
    }

    /// Returns the current price per token unit. Publicly queryable.
    pub fn get_price(env: Env) -> i128 {
        let params: CurveParams = env.storage().instance().get(&"curve_params").unwrap();
        let tokens_sold: i128 = env.storage().persistent().get(&"tokens_sold").unwrap();
        calculate_price(&params, tokens_sold)
    }

    /// Returns the current buy price per token unit (price at current supply).
    /// Publicly queryable.
    pub fn get_buy_price(env: Env) -> i128 {
        let params: CurveParams = env.storage().instance().get(&"curve_params").unwrap();
        let tokens_sold: i128 = env.storage().persistent().get(&"tokens_sold").unwrap();
        calculate_price(&params, tokens_sold)
    }

    /// Returns the current sell price per token unit (price at current supply).
    /// This is the same as the buy price in the exponential bonding curve.
    /// Publicly queryable.
    pub fn get_sell_price(env: Env) -> i128 {
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

    /// Returns the accumulated admin fees not yet withdrawn. Publicly
    /// queryable.
    pub fn get_admin_fees(env: Env) -> i128 {
        env.storage().persistent().get(&"admin_fees").unwrap_or(0)
    }

    /// Claims the accumulated admin fees on behalf of `recipient`. Admin only.
    ///
    /// This contract is an accounting layer; the actual payment is expected to
    /// be settled by the calling token. Withdrawing clears the tally, returns
    /// the claimed amount, and emits an event so the token can make the
    /// payout. Panics if the caller is not the admin or there are no fees to
    /// withdraw.
    pub fn withdraw_fees(env: Env, recipient: Address) -> i128 {
        let admin: Address = env.storage().instance().get(&"admin").unwrap();
        admin.require_auth();
        let amount: i128 = env.storage().persistent().get(&"admin_fees").unwrap_or(0);
        if amount <= 0 {
            panic!("bonding curve: no fees to withdraw");
        }
        env.storage().persistent().set(&"admin_fees", &0i128);
        env.events().publish(
            (String::from_str(&env, "WithdrawFees"), admin),
            (recipient, amount),
        );
        amount
    }

    /// Returns a snapshot of the curve's full state: token, params, reserve,
    /// tokens sold, price, market cap, admin, fee rate, cap, graduation status,
    /// and admin fees. Publicly queryable.
    pub fn get_curve_info(env: Env) -> CurveInfo {
        let token_id: Address = env.storage().instance().get(&"token_id").unwrap();
        let params: CurveParams = env.storage().instance().get(&"curve_params").unwrap();
        let reserve: i128 = env.storage().persistent().get(&"reserve").unwrap();
        let tokens_sold: i128 = env.storage().persistent().get(&"tokens_sold").unwrap();
        let admin: Address = env.storage().instance().get(&"admin").unwrap();
        let fee_rate: i128 = env.storage().instance().get(&"fee_rate").unwrap_or(0);
        let cap: i128 = env.storage().instance().get(&"cap").unwrap_or(i128::MAX);
        let graduated: bool = env.storage().instance().get(&"graduated").unwrap_or(false);
        let admin_fees: i128 = env.storage().persistent().get(&"admin_fees").unwrap_or(0);
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
            fee_rate,
            cap,
            graduated,
            admin_fees,
        }
    }

    /// Returns the current fee rate in basis points (0-10000). Publicly
    /// queryable.
    pub fn get_fee_rate(env: Env) -> i128 {
        env.storage().instance().get(&"fee_rate").unwrap_or(0)
    }

    /// Sets the fee rate in basis points. Admin only. Must be 0-10000. Panics
    /// if the caller is not the admin or the rate is out of bounds.
    pub fn set_fee_rate(env: Env, rate: i128) {
        let admin: Address = env.storage().instance().get(&"admin").unwrap();
        admin.require_auth();
        if rate < 0 || rate > 10000 {
            panic!("bonding curve: fee rate out of bounds");
        }
        env.storage().instance().set(&"fee_rate", &rate);
        env.events().publish(
            (String::from_str(&env, "SetFeeRate"), admin),
            (rate,),
        );
    }

    /// Sets the minimum and maximum buy amounts. Admin only. Panics if the
    /// caller is not the admin or min > max.
    pub fn set_buy_limits(env: Env, min_buy: i128, max_buy: i128) {
        let admin: Address = env.storage().instance().get(&"admin").unwrap();
        admin.require_auth();
        if min_buy > max_buy {
            panic!("bonding curve: invalid buy limits");
        }
        env.storage().instance().set(&"min_buy", &min_buy);
        env.storage().instance().set(&"max_buy", &max_buy);
        env.events().publish(
            (String::from_str(&env, "SetBuyLimits"), admin),
            (min_buy, max_buy),
        );
    }

    /// Sets the minimum and maximum sell amounts. Admin only. Panics if the
    /// caller is not the admin or min > max.
    pub fn set_sell_limits(env: Env, min_sell: i128, max_sell: i128) {
        let admin: Address = env.storage().instance().get(&"admin").unwrap();
        admin.require_auth();
        if min_sell > max_sell {
            panic!("bonding curve: invalid sell limits");
        }
        env.storage().instance().set(&"min_sell", &min_sell);
        env.storage().instance().set(&"max_sell", &max_sell);
        env.events().publish(
            (String::from_str(&env, "SetSellLimits"), admin),
            (min_sell, max_sell),
        );
    }

    /// Returns the current curve cap (maximum tokens that can be sold). Publicly
    /// queryable.
    pub fn get_cap(env: Env) -> i128 {
        env.storage().instance().get(&"cap").unwrap_or(i128::MAX)
    }

    /// Sets the curve cap. Admin only. Panics if the caller is not the admin or
    /// if the cap is less than tokens already sold.
    pub fn set_cap(env: Env, cap: i128) {
        let admin: Address = env.storage().instance().get(&"admin").unwrap();
        admin.require_auth();
        let tokens_sold: i128 = env.storage().persistent().get(&"tokens_sold").unwrap();
        if cap < tokens_sold {
            panic!("bonding curve: cap cannot be below tokens sold");
        }
        env.storage().instance().set(&"cap", &cap);
        env.events().publish(
            (String::from_str(&env, "SetCap"), admin),
            (cap,),
        );
    }

    /// Returns whether the curve has graduated (reached its cap). Publicly
    /// queryable.
    pub fn is_graduated(env: Env) -> bool {
        env.storage().instance().get(&"graduated").unwrap_or(false)
    }

    /// Returns the current reserve ratio: (reserve / market_cap). A ratio of 0
    /// means no reserve, 1 means reserve equals market cap. Publicly queryable.
    pub fn get_reserve_ratio(env: Env) -> i128 {
        let reserve: i128 = env.storage().persistent().get(&"reserve").unwrap();
        let params: CurveParams = env.storage().instance().get(&"curve_params").unwrap();
        let tokens_sold: i128 = env.storage().persistent().get(&"tokens_sold").unwrap();
        let price = calculate_price(&params, tokens_sold);
        let market_cap = price
            .checked_mul(tokens_sold)
            .unwrap_or_else(|| panic!("bonding curve: market cap overflow"));
        if market_cap == 0 {
            return 0;
        }
        reserve.checked_mul(10_000_000)
            .unwrap_or_else(|| panic!("bonding curve: reserve ratio overflow"))
            / market_cap
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
