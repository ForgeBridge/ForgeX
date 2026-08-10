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
    let max_cost = i128::MAX;
    assert!(client
        .try_buy(&buyer, &0i128, &max_cost, &u64::MAX)
        .is_err());
    assert!(client
        .try_buy(&buyer, &(-10i128), &max_cost, &u64::MAX)
        .is_err());
    assert_eq!(client.get_tokens_sold(), 0);
    assert_eq!(client.get_reserve(), 0);
}

#[test]
fn test_buy_slippage_protection() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let buyer = generate_address(&env);

    // A limit below any possible cost (negative) is refused and leaves state
    // untouched.
    let before_sold = client.get_tokens_sold();
    let before_reserve = client.get_reserve();
    assert!(client
        .try_buy(&buyer, &1000i128, &(-1i128), &u64::MAX)
        .is_err());
    assert_eq!(client.get_tokens_sold(), before_sold);
    assert_eq!(client.get_reserve(), before_reserve);

    // The same purchase succeeds with a permissive limit.
    client.buy(&buyer, &1000i128, &i128::MAX, &u64::MAX);
    assert_eq!(client.get_tokens_sold(), 1000);
}

#[test]
fn test_sell_rejects_invalid_amounts() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let seller = generate_address(&env);
    let min_payout = 0i128;
    // Selling nothing or more than the total sold is rejected.
    assert!(client
        .try_sell(&seller, &0i128, &min_payout, &u64::MAX)
        .is_err());
    assert!(client
        .try_sell(&seller, &(-10i128), &min_payout, &u64::MAX)
        .is_err());
    // Nothing has been sold yet, so any positive sell amount is also invalid.
    assert!(client
        .try_sell(&seller, &100i128, &min_payout, &u64::MAX)
        .is_err());
    assert_eq!(client.get_tokens_sold(), 0);
    assert_eq!(client.get_reserve(), 0);
}

#[test]
fn test_sell_slippage_protection() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let seller = generate_address(&env);
    client.buy(&seller, &1000i128, &i128::MAX, &u64::MAX);

    // A minimum payout that can never be achieved is refused and leaves state
    // untouched; an achievable minimum is accepted.
    assert!(client
        .try_sell(&seller, &500i128, &i128::MAX, &u64::MAX)
        .is_err());
    assert_eq!(client.get_tokens_sold(), 1000);
    client.sell(&seller, &500i128, &0i128, &u64::MAX);
    assert_eq!(client.get_tokens_sold(), 500);
}

#[test]
fn test_trades_respect_deadline() {
    use soroban_sdk::testutils::Ledger;

    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let trader = generate_address(&env);

    // Move the ledger to a known time; buy and sell already executing before
    // their deadline still succeed.
    env.ledger().set_timestamp(1_000_000);
    client.buy(&trader, &1000i128, &i128::MAX, &1_000_000);

    // Once the ledger moves past the deadline the same order is refused.
    env.ledger().set_timestamp(1_000_001);
    assert!(client
        .try_buy(&trader, &100i128, &i128::MAX, &1_000_000)
        .is_err());
    assert!(client
        .try_sell(&trader, &100i128, &0i128, &1_000_000)
        .is_err());

    // A deadline in the future still permits execution.
    assert_eq!(client.get_tokens_sold(), 1000);
    client.sell(&trader, &500i128, &0i128, &1_000_001);
    assert_eq!(client.get_tokens_sold(), 500);
}

#[test]
fn test_buy_keeps_state_consistent() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let buyer = generate_address(&env);
    let cost = client.buy(&buyer, &1000i128, &i128::MAX, &u64::MAX);
    // After a buy the recorded supply always grows by the bought amount and
    // the reserve always grows by the charged cost, whatever the cost is.
    assert_eq!(client.get_tokens_sold(), 1000);
    assert_eq!(client.get_reserve(), cost);
    let info = client.get_curve_info();
    assert_eq!(info.tokens_sold, 1000);
    assert_eq!(info.reserve, cost);
    assert_eq!(info.market_cap, info.price * info.tokens_sold / 10_000_000);
}
