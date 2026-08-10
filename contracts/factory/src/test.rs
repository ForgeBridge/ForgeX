use soroban_sdk::testutils;
use soroban_sdk::{Address, Env, String};

use crate::factory::{CurveParams, FactoryContract, FactoryContractClient};

fn deploy_factory<'a>(env: &'a Env, admin: &Address) -> (Address, FactoryContractClient<'a>) {
    let contract_id: Address = env.register(FactoryContract, ());
    let client = FactoryContractClient::new(env, &contract_id);
    client.initialize(admin);
    (contract_id, client)
}

fn generate_address(env: &Env) -> Address {
    <Address as testutils::Address>::generate(env)
}

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, _client) = deploy_factory(&env, &admin);
}

#[test]
fn test_create_token() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let params = crate::factory::CreateTokenParams {
        name: String::from_str(&env, "Test Token"),
        symbol: String::from_str(&env, "TEST"),
        decimals: 7u32,
        max_supply: 10_000_000_000_000_000i128,
        image_uri: String::from_str(&env, "ipfs://Qmtest"),
        description: String::from_str(&env, "A test token"),
        curve_params: CurveParams {
            initial_price: 100i128,
            steepness: 1i128,
            reserve_target: 5_000_000_000_000i128,
        },
    };
    let (_token_id, _curve_id) = client.create_token(&params);
    assert_eq!(client.get_token_count(), 1);
}

#[test]
fn test_create_token_rejects_invalid_metadata() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let base = |name: String, symbol: String, decimals: u32| crate::factory::CreateTokenParams {
        name,
        symbol,
        decimals,
        max_supply: 10_000_000_000_000_000i128,
        image_uri: String::from_str(&env, ""),
        description: String::from_str(&env, ""),
        curve_params: CurveParams {
            initial_price: 100i128,
            steepness: 1i128,
            reserve_target: 5_000_000_000_000i128,
        },
    };

    assert!(client
        .try_create_token(&base(
            String::from_str(&env, ""),
            String::from_str(&env, "T"),
            7
        ))
        .is_err());
    assert!(client
        .try_create_token(&base(
            String::from_str(&env, "T"),
            String::from_str(&env, ""),
            7
        ))
        .is_err());
    assert!(client
        .try_create_token(&base(
            String::from_str(&env, &"n".repeat(33)),
            String::from_str(&env, "T"),
            7
        ))
        .is_err());
    assert!(client
        .try_create_token(&base(
            String::from_str(&env, "T"),
            String::from_str(&env, &"s".repeat(33)),
            7
        ))
        .is_err());
    assert!(client
        .try_create_token(&base(
            String::from_str(&env, "T"),
            String::from_str(&env, "T"),
            256
        ))
        .is_err());

    // Nothing was recorded.
    assert_eq!(client.get_token_count(), 0);
}

#[test]
fn test_get_tokens_paginated() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let params = crate::factory::CreateTokenParams {
        name: String::from_str(&env, "T1"),
        symbol: String::from_str(&env, "T1"),
        decimals: 7u32,
        max_supply: 10_000_000_000_000_000i128,
        image_uri: String::from_str(&env, ""),
        description: String::from_str(&env, ""),
        curve_params: CurveParams {
            initial_price: 100i128,
            steepness: 1i128,
            reserve_target: 5_000_000_000_000i128,
        },
    };
    client.create_token(&params);
    client.create_token(&params);
    let tokens = client.get_tokens_paginated(&0u64, &10u64);
    assert_eq!(tokens.len(), 2);
}
