use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

use crate::math::{calculate_buy_cost, calculate_price, calculate_sell_payout};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct CurveParams {
    pub initial_price: i128,
    pub steepness: i128,
    pub reserve_target: i128,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct CurveInfo {
    pub token_id: Address,
    pub params: CurveParams,
    pub reserve: i128,
    pub tokens_sold: i128,
    pub price: i128,
    pub market_cap: i128,
    pub admin: Address,
}

#[contract]
pub struct BondingCurveContract;

#[contractimpl]
impl BondingCurveContract {
    pub fn initialize(env: Env, token_id: Address, curve_params: CurveParams, admin: Address) {
        env.storage().instance().set(&"token_id", &token_id);
        env.storage().instance().set(&"curve_params", &curve_params);
        env.storage().instance().set(&"admin", &admin);
        env.storage().persistent().set(&"reserve", &0i128);
        env.storage().persistent().set(&"tokens_sold", &0i128);
    }

    pub fn buy(env: Env, buyer: Address, amount_out: i128) -> i128 {
        buyer.require_auth();
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
        cost
    }

    pub fn sell(env: Env, seller: Address, amount_in: i128) -> i128 {
        seller.require_auth();
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
        payout
    }

    pub fn get_price(env: Env) -> i128 {
        let params: CurveParams = env.storage().instance().get(&"curve_params").unwrap();
        let tokens_sold: i128 = env.storage().persistent().get(&"tokens_sold").unwrap();
        calculate_price(&params, tokens_sold)
    }

    pub fn get_reserve(env: Env) -> i128 {
        env.storage().persistent().get(&"reserve").unwrap()
    }

    pub fn get_tokens_sold(env: Env) -> i128 {
        env.storage().persistent().get(&"tokens_sold").unwrap()
    }

    pub fn get_market_cap(env: Env) -> i128 {
        let params: CurveParams = env.storage().instance().get(&"curve_params").unwrap();
        let tokens_sold: i128 = env.storage().persistent().get(&"tokens_sold").unwrap();
        let price = calculate_price(&params, tokens_sold);
        price
            .checked_mul(tokens_sold)
            .unwrap_or_else(|| panic!("bonding curve: market cap overflow"))
            / 10_000_000
    }

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
