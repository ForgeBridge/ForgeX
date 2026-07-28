use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

use crate::math::{calculate_buy_cost, calculate_sell_payout, calculate_price};
use crate::pool::Pool;

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
        let params: CurveParams = env.storage().instance().get(&"curve_params").unwrap();
        let tokens_sold: i128 = env.storage().persistent().get(&"tokens_sold").unwrap();
        let reserve: i128 = env.storage().persistent().get(&"reserve").unwrap();
        let cost = calculate_buy_cost(&params, tokens_sold, tokens_sold + amount_out);
        let new_reserve = reserve + cost;
        let new_tokens_sold = tokens_sold + amount_out;
        env.storage().persistent().set(&"reserve", &new_reserve);
        env.storage().persistent().set(&"tokens_sold", &new_tokens_sold);
        let new_price = calculate_price(&params, new_tokens_sold);
        env.events().publish(
            (String::from_str(&env, "Buy"), buyer.clone()),
            (buyer.clone(), amount_out, cost, new_price, new_reserve),
        );
        cost
    }

    pub fn sell(env: Env, seller: Address, amount_in: i128) -> i128 {
        seller.require_auth();
        let params: CurveParams = env.storage().instance().get(&"curve_params").unwrap();
        let tokens_sold: i128 = env.storage().persistent().get(&"tokens_sold").unwrap();
        let reserve: i128 = env.storage().persistent().get(&"reserve").unwrap();
        let payout = calculate_sell_payout(&params, tokens_sold, tokens_sold - amount_in);
        let new_reserve = reserve - payout;
        let new_tokens_sold = tokens_sold - amount_in;
        env.storage().persistent().set(&"reserve", &new_reserve);
        env.storage().persistent().set(&"tokens_sold", &new_tokens_sold);
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
        price * tokens_sold / 10_000_000
    }

    pub fn get_curve_info(env: Env) -> CurveInfo {
        let token_id: Address = env.storage().instance().get(&"token_id").unwrap();
        let params: CurveParams = env.storage().instance().get(&"curve_params").unwrap();
        let reserve: i128 = env.storage().persistent().get(&"reserve").unwrap();
        let tokens_sold: i128 = env.storage().persistent().get(&"tokens_sold").unwrap();
        let admin: Address = env.storage().instance().get(&"admin").unwrap();
        let price = calculate_price(&params, tokens_sold);
        let market_cap = price * tokens_sold / 10_000_000;
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