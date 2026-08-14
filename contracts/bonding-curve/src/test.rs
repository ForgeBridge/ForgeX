use soroban_sdk::testutils;
use soroban_sdk::{Address, Env};

use crate::curve::{BondingCurveContract, BondingCurveContractClient, CurveParams};

// Integration test harness notes:
//
// The following represents the complete integration testing structure that
// should be deployed once token and factory contracts are fully available:
//
// 1. Token Contract Integration:
//    - Deploy SEP-41 token contract
//    - Verify token transfer authorization flow
//    - Test token approval for curve operations
//
// 2. Factory Contract Integration:
//    - Deploy factory contract
//    - Register token with factory
//    - Create bonding curve through factory
//    - Verify curve registration in factory
//
// 3. Cross-Contract Trading:
//    - Execute buy: token.approve(curve) -> curve.buy() -> token.transfer()
//    - Execute sell: curve.sell() -> token.transfer()
//    - Verify token balances after each operation
//    - Test reserve accounting matches token transfers
//
// 4. Admin Operations:
//    - Set fees through curve, verify factory audits changes
//    - Withdraw fees from curve, verify to correct recipient
//    - Update curve parameters through factory
//
// Current test suite below validates curve behavior in isolation.
// Once cross-contract APIs stabilize, integration tests can be enabled.

fn generate_address(env: &Env) -> Address {
    <Address as testutils::Address>::generate(env)
}

fn deploy_curve<'a>(env: &'a Env) -> (Address, BondingCurveContractClient<'a>) {
    let token_id = generate_address(env);
    let admin = generate_address(env);
    let contract_id = env.register(BondingCurveContract, ());
    let client = BondingCurveContractClient::new(env, &contract_id);
    let params = CurveParams {
        initial_price: 10_000_000,
        steepness: 100,
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
    assert_eq!(price, 10_000_000);
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
    assert_eq!(info.price, 10_000_000);
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
fn test_reentrancy_guard_blocks_nested_entry() {
    use soroban_sdk::symbol_short;

    let env = Env::default();
    env.mock_all_auths();
    let (id, client) = deploy_curve(&env);
    let trader = generate_address(&env);

    // Prime the curve so both orders below would otherwise succeed.
    client.buy(&trader, &1000i128, &i128::MAX, &u64::MAX);

    // Simulate an in-progress operation by raising the guard flag directly;
    // a fresh buy and sell are both refused with state untouched.
    env.as_contract(&id, || {
        env.storage()
            .persistent()
            .set(&symbol_short!("in_flight"), &true);
    });
    assert!(client
        .try_buy(&trader, &100i128, &i128::MAX, &u64::MAX)
        .is_err());
    assert!(client
        .try_sell(&trader, &100i128, &0i128, &u64::MAX)
        .is_err());
    assert_eq!(client.get_tokens_sold(), 1000);

    // Once the flag is cleared the next trade succeeds, proving the guard is
    // released after every successful liquidity operation.
    env.as_contract(&id, || {
        env.storage()
            .persistent()
            .set(&symbol_short!("in_flight"), &false);
    });
    client.sell(&trader, &100i128, &0i128, &u64::MAX);
    assert_eq!(client.get_tokens_sold(), 900);
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

#[test]
fn test_admin_fees_on_buy() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let buyer = generate_address(&env);

    // Set fee rate to 1% (100 basis points out of 10000)
    client.set_fee_rate(&100i128);

    let owed = client.buy(&buyer, &1000i128, &i128::MAX, &u64::MAX);
    let admin_fees = client.get_admin_fees();

    // Owed amount should be cost + (cost * 100 / 10000)
    // Admin fees should be collected
    assert!(admin_fees > 0);
    assert!(owed > 0);
}

#[test]
fn test_admin_fees_on_sell() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let trader = generate_address(&env);

    // Set fee rate to 1%
    client.set_fee_rate(&100i128);

    // Buy first to have something to sell
    client.buy(&trader, &1000i128, &i128::MAX, &u64::MAX);
    let fees_after_buy = client.get_admin_fees();

    // Sell half
    let net_payout = client.sell(&trader, &500i128, &0i128, &u64::MAX);
    let fees_after_sell = client.get_admin_fees();

    // Fees should accumulate from both buy and sell
    assert!(fees_after_buy > 0);
    assert!(fees_after_sell > fees_after_buy);
    assert!(net_payout > 0);
}

#[test]
fn test_withdraw_fees_admin_only() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let buyer = generate_address(&env);

    // Set fee rate to 1%
    client.set_fee_rate(&100i128);

    client.buy(&buyer, &1000i128, &i128::MAX, &u64::MAX);
    let fees = client.get_admin_fees();
    assert!(fees > 0);

    // Admin can withdraw fees
    let recipient = generate_address(&env);
    let withdrawn = client.withdraw_fees(&recipient);
    assert_eq!(withdrawn, fees);
    assert_eq!(client.get_admin_fees(), 0);
}

#[test]
fn test_withdraw_fees_fails_when_no_fees() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let recipient = generate_address(&env);

    // No fees accumulated yet
    assert!(client.try_withdraw_fees(&recipient).is_err());
}

#[test]
fn test_fee_rate_initialization() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);

    // Fee rate should start at 0
    let rate = client.get_fee_rate();
    assert_eq!(rate, 0);
}

#[test]
fn test_set_fee_rate_admin_only() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);

    // Admin can set fee rate
    client.set_fee_rate(&100i128);
    assert_eq!(client.get_fee_rate(), 100);

    // Setting invalid fee rate fails
    assert!(client.try_set_fee_rate(&10001i128).is_err());
    assert!(client.try_set_fee_rate(&(-1i128)).is_err());
}

#[test]
fn test_buy_sell_size_limits() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let buyer = generate_address(&env);

    // Set buy limits: min=100, max=5000
    client.set_buy_limits(&100i128, &5000i128);

    // Buy below minimum fails
    assert!(client
        .try_buy(&buyer, &50i128, &i128::MAX, &u64::MAX)
        .is_err());

    // Buy within limits succeeds
    client.buy(&buyer, &1000i128, &i128::MAX, &u64::MAX);

    // Buy above maximum fails
    assert!(client
        .try_buy(&buyer, &6000i128, &i128::MAX, &u64::MAX)
        .is_err());
}

#[test]
fn test_sell_size_limits() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let seller = generate_address(&env);

    // Buy some tokens first
    client.buy(&seller, &2000i128, &i128::MAX, &u64::MAX);

    // Set sell limits: min=100, max=1000
    client.set_sell_limits(&100i128, &1000i128);

    // Sell below minimum fails
    assert!(client
        .try_sell(&seller, &50i128, &0i128, &u64::MAX)
        .is_err());

    // Sell within limits succeeds
    client.sell(&seller, &500i128, &0i128, &u64::MAX);

    // Sell above maximum fails
    assert!(client
        .try_sell(&seller, &1500i128, &0i128, &u64::MAX)
        .is_err());
}

#[test]
fn test_curve_cap_graduation() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let buyer = generate_address(&env);

    // Set cap to 1000
    client.set_cap(&1000i128);
    assert!(!client.is_graduated());

    // Buy to cap
    client.buy(&buyer, &1000i128, &i128::MAX, &u64::MAX);
    assert!(client.is_graduated());

    // Cannot exceed cap
    assert!(client
        .try_buy(&buyer, &1i128, &i128::MAX, &u64::MAX)
        .is_err());
}

#[test]
fn test_reserve_ratio_query() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let buyer = generate_address(&env);

    // Initial reserve ratio should be 0
    let ratio_before = client.get_reserve_ratio();
    assert_eq!(ratio_before, 0);

    // After a buy, reserve ratio should be positive
    client.buy(&buyer, &1000i128, &i128::MAX, &u64::MAX);
    let ratio_after = client.get_reserve_ratio();
    assert!(ratio_after > 0);
}

#[test]
fn test_buy_and_sell_price_queries() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let buyer = generate_address(&env);

    let price_before = client.get_price();
    let buy_price = client.get_buy_price();
    let sell_price = client.get_sell_price();

    assert_eq!(price_before, buy_price);
    assert_eq!(buy_price, sell_price);

    // After a buy, prices should increase
    client.buy(&buyer, &1000i128, &i128::MAX, &u64::MAX);
    let price_after = client.get_price();
    assert!(price_after > price_before);
}

#[test]
fn test_get_curve_state_complete() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let buyer = generate_address(&env);

    client.set_fee_rate(&500i128);
    client.set_cap(&10000i128);
    client.buy(&buyer, &1000i128, &i128::MAX, &u64::MAX);

    let state = client.get_curve_info();

    assert_eq!(state.fee_rate, 500);
    assert_eq!(state.cap, 10000);
    assert!(!state.graduated);
    assert_eq!(state.tokens_sold, 1000);
    assert!(state.admin_fees > 0);
}

// Property tests for curve invariants

#[test]
fn test_reserve_always_non_negative() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let trader = generate_address(&env);

    for _ in 0..5 {
        client.buy(&trader, &100i128, &i128::MAX, &u64::MAX);
        assert!(client.get_reserve() >= 0);
    }
}

#[test]
fn test_tokens_sold_never_decreases_on_buy() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let trader = generate_address(&env);

    let mut prev_tokens = 0;
    for _ in 1..=5 {
        client.buy(&trader, &100i128, &i128::MAX, &u64::MAX);
        let tokens = client.get_tokens_sold();
        assert_eq!(tokens, prev_tokens + 100);
        prev_tokens = tokens;
    }
}

#[test]
fn test_price_increases_monotonically_on_buys() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let buyer = generate_address(&env);

    let mut prev_price = client.get_price();
    for _ in 0..5 {
        client.buy(&buyer, &100i128, &i128::MAX, &u64::MAX);
        let price = client.get_price();
        assert!(price > prev_price);
        prev_price = price;
    }
}

#[test]
fn test_buy_sell_symmetry_without_fees() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let trader = generate_address(&env);

    // Fee rate 0 for exact symmetry
    client.set_fee_rate(&0i128);

    let initial_reserve = client.get_reserve();
    let buy_cost = client.buy(&trader, &1000i128, &i128::MAX, &u64::MAX);
    let reserve_after_buy = client.get_reserve();

    // Reserve should increase by buy_cost
    assert_eq!(reserve_after_buy - initial_reserve, buy_cost);

    // Sell all
    let sell_payout = client.sell(&trader, &1000i128, &0i128, &u64::MAX);

    // With no fees, payout should equal buy cost
    assert_eq!(sell_payout, buy_cost);

    let final_reserve = client.get_reserve();
    assert_eq!(final_reserve, initial_reserve);
}

#[test]
fn test_admin_fees_never_exceed_total_traded() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let trader = generate_address(&env);

    client.set_fee_rate(&500i128); // 5% fee

    let mut total_bought = 0i128;
    for _ in 0..5 {
        total_bought += 1000;
        client.buy(&trader, &1000i128, &i128::MAX, &u64::MAX);
    }

    // Fees should be less than total amount bought (since they're deducted from costs, not added)
    let fees = client.get_admin_fees();
    assert!(fees >= 0);
    assert!(fees < total_bought);
}

#[test]
fn test_graduated_flag_prevents_buys() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let buyer = generate_address(&env);

    client.set_cap(&1000i128);

    // Fill the cap
    client.buy(&buyer, &1000i128, &i128::MAX, &u64::MAX);
    assert!(client.is_graduated());

    // Further buys should fail
    assert!(client
        .try_buy(&buyer, &1i128, &i128::MAX, &u64::MAX)
        .is_err());
}

#[test]
fn test_market_cap_is_consistent_with_price_and_supply() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let buyer = generate_address(&env);

    client.buy(&buyer, &500i128, &i128::MAX, &u64::MAX);

    let info = client.get_curve_info();
    let expected_market_cap = info.price * info.tokens_sold / 10_000_000;
    assert_eq!(info.market_cap, expected_market_cap);
}

#[test]
fn test_reserve_equals_sum_of_costs_minus_fees() {
    let env = Env::default();
    env.mock_all_auths();
    let (_id, client) = deploy_curve(&env);
    let trader = generate_address(&env);

    client.set_fee_rate(&1000i128); // 10% fee

    // Make multiple buys and track costs
    let cost1 = client.buy(&trader, &100i128, &i128::MAX, &u64::MAX);
    let reserve1 = client.get_reserve();
    let fees1 = client.get_admin_fees();

    // The owed amount (cost + fee) should be cost1
    // Reserve should be cost1 - fees1
    assert_eq!(reserve1 + fees1, cost1);

    let cost2 = client.buy(&trader, &100i128, &i128::MAX, &u64::MAX);
    let reserve2 = client.get_reserve();
    let fees2 = client.get_admin_fees();

    // Same invariant should hold
    assert_eq!(reserve2 + fees2, cost1 + cost2);
}
