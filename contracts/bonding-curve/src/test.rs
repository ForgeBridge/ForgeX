use soroban_sdk::testutils;
use soroban_sdk::{Address, Env};

use crate::curve::{BondingCurveContract, BondingCurveContractClient, CurveParams};

fn generate_address(env: &Env) -> Address {
    <Address as testutils::Address>::generate(env)
}

fn deploy_curve<'a>(env: &'a Env) -> (Address, BondingCurveContractClient<'a>) {
    let token_id = generate_address(env);
    let admin = generate_address(env);
    let contract_id = env.register(BondingCurveContract, ());
    let client = BondingCurveContractClient::new(env, &contract_id);
    let params = CurveParams {
        initial_price: 100,
        steepness: 1,
        reserve_target: 5_000_000_000_000,
    };
    client.initialize(&token_id, &params, &admin);
    (contract_id, client)
}

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let price = client.get_price();
    assert_eq!(price, 100);
}

#[test]
fn test_get_reserve_initial() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    assert_eq!(client.get_reserve(), 0);
}

#[test]
fn test_get_tokens_sold_initial() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    assert_eq!(client.get_tokens_sold(), 0);
}

#[test]
fn test_get_curve_info() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let info = client.get_curve_info();
    assert_eq!(info.price, 100);
    assert_eq!(info.reserve, 0);
    assert_eq!(info.tokens_sold, 0);
}

#[test]
fn test_buy_rejects_non_positive_amounts() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let buyer = generate_address(&env);
    assert!(client.try_buy(&buyer, &0i128).is_err());
    assert!(client.try_buy(&buyer, &(-10i128)).is_err());
    assert_eq!(client.get_tokens_sold(), 0);
    assert_eq!(client.get_reserve(), 0);
}

#[test]
fn test_sell_rejects_invalid_amounts() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let seller = generate_address(&env);
    // Selling nothing or more than the total sold is rejected.
    assert!(client.try_sell(&seller, &0i128).is_err());
    assert!(client.try_sell(&seller, &(-10i128)).is_err());
    // Nothing has been sold yet, so any positive sell amount is also invalid.
    assert!(client.try_sell(&seller, &100i128).is_err());
    assert_eq!(client.get_tokens_sold(), 0);
    assert_eq!(client.get_reserve(), 0);
}

#[test]
fn test_buy_keeps_state_consistent() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let buyer = generate_address(&env);
    let cost = client.buy(&buyer, &1000i128);
    // After a buy the recorded supply always grows by the bought amount and
    // the reserve always grows by the charged cost, whatever the cost is.
    assert_eq!(client.get_tokens_sold(), 1000);
    assert_eq!(client.get_reserve(), cost);
    let info = client.get_curve_info();
    assert_eq!(info.tokens_sold, 1000);
    assert_eq!(info.reserve, cost);
    assert_eq!(info.market_cap, info.price * info.tokens_sold / 10_000_000);
}
