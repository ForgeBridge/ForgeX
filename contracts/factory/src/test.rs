use soroban_sdk::testutils::{self, Events};
use soroban_sdk::{Address, Env, IntoVal, String, Symbol};

use crate::error::ContractError;
use crate::factory::{
    CreateTokenParams, CurveParams, FactoryContract, FactoryContractClient, TokenInfo,
};

fn deploy_factory<'a>(env: &'a Env, admin: &Address) -> (Address, FactoryContractClient<'a>) {
    let contract_id: Address = env.register(FactoryContract, ());
    let client = FactoryContractClient::new(env, &contract_id);
    client.initialize(admin);
    (contract_id, client)
}

fn generate_address(env: &Env) -> Address {
    <Address as testutils::Address>::generate(env)
}

/// Registers a live contract so the returned address verifiably exists in the
/// ledger, standing in for a deployed token or curve contract.
fn registered_address(env: &Env) -> Address {
    env.register(FactoryContract, ())
}

fn make_params(
    env: &Env,
    token_id: &Address,
    curve_id: &Address,
    name: &str,
    symbol: &str,
) -> CreateTokenParams {
    CreateTokenParams {
        token_id: token_id.clone(),
        curve_id: curve_id.clone(),
        name: String::from_str(env, name),
        symbol: String::from_str(env, symbol),
        decimals: 7u32,
        max_supply: 10_000_000_000_000_000i128,
        image_uri: String::from_str(env, ""),
        description: String::from_str(env, ""),
        curve_params: CurveParams {
            initial_price: 100i128,
            steepness: 1i128,
            reserve_target: 5_000_000_000_000i128,
        },
    }
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
    let token = registered_address(&env);
    let curve = registered_address(&env);
    let params = make_params(&env, &token, &curve, "Test Token", "TEST");
    let (recorded_token, recorded_curve) = client.create_token(&params);
    assert_eq!(recorded_token, token);
    assert_eq!(recorded_curve, curve);
    assert_eq!(client.get_token_count(), 1);
}

#[test]
fn test_token_created_emits_full_details() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (id, client) = deploy_factory(&env, &admin);
    let token = registered_address(&env);
    let curve = registered_address(&env);
    let params = make_params(&env, &token, &curve, "Test Token", "TEST");
    client.create_token(&params);

    let expected = TokenInfo {
        token_id: token.clone(),
        curve_id: curve.clone(),
        creator: admin.clone(),
        name: String::from_str(&env, "Test Token"),
        symbol: String::from_str(&env, "TEST"),
        decimals: 7u32,
        max_supply: 10_000_000_000_000_000i128,
        image_uri: String::from_str(&env, ""),
        description: String::from_str(&env, ""),
        created_at: env.ledger().timestamp(),
    };

    // The `TokenCreated` event carries the full registry record as data,
    // keyed by the creator and the deployed token address.
    assert_eq!(
        env.events().all(),
        soroban_sdk::vec![
            &env,
            (
                id,
                soroban_sdk::vec![
                    &env,
                    Symbol::new(&env, "TokenCreated").into_val(&env),
                    admin.clone().into_val(&env),
                    token.clone().into_val(&env),
                ],
                expected.into_val(&env),
            ),
        ]
    );
}

#[test]
fn test_create_token_rejects_duplicate_by_address() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let token = registered_address(&env);
    let curve = registered_address(&env);

    client.create_token(&make_params(&env, &token, &curve, "Alpha", "ALPHA"));

    // Same token address, different name/symbol.
    let dup = make_params(&env, &token, &registered_address(&env), "Beta", "BETA");
    let result = client.try_create_token(&dup);
    assert_eq!(result.unwrap_err().unwrap(), ContractError::TokenExists);
    assert_eq!(client.get_token_count(), 1);
}

#[test]
fn test_create_token_rejects_duplicate_by_name() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let token = registered_address(&env);
    let curve = registered_address(&env);

    client.create_token(&make_params(&env, &token, &curve, "Alpha", "ALPHA"));

    // Different address and symbol, same name.
    let dup = make_params(
        &env,
        &registered_address(&env),
        &registered_address(&env),
        "Alpha",
        "BETA",
    );
    let result = client.try_create_token(&dup);
    assert_eq!(result.unwrap_err().unwrap(), ContractError::TokenExists);
    assert_eq!(client.get_token_count(), 1);
}

#[test]
fn test_create_token_rejects_duplicate_by_symbol() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let token = registered_address(&env);
    let curve = registered_address(&env);

    client.create_token(&make_params(&env, &token, &curve, "Alpha", "ALPHA"));

    // Different address and name, same symbol.
    let dup = make_params(
        &env,
        &registered_address(&env),
        &registered_address(&env),
        "Beta",
        "ALPHA",
    );
    let result = client.try_create_token(&dup);
    assert_eq!(result.unwrap_err().unwrap(), ContractError::TokenExists);
    assert_eq!(client.get_token_count(), 1);
}

#[test]
fn test_create_token_rejects_invalid_metadata() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let token = registered_address(&env);
    let curve = registered_address(&env);

    assert!(client
        .try_create_token(&make_params(&env, &token, &curve, "", "T"))
        .is_err());
    assert!(client
        .try_create_token(&make_params(&env, &token, &curve, "T", ""))
        .is_err());
    assert!(client
        .try_create_token(&make_params(&env, &token, &curve, &"n".repeat(33), "T"))
        .is_err());
    assert!(client
        .try_create_token(&make_params(&env, &token, &curve, "T", &"s".repeat(33)))
        .is_err());

    let mut invalid_decimals = make_params(&env, &token, &curve, "T", "T");
    invalid_decimals.decimals = 256;
    assert!(client.try_create_token(&invalid_decimals).is_err());

    // Nothing was recorded.
    assert_eq!(client.get_token_count(), 0);
}

#[test]
fn test_create_token_rejects_negative_max_supply() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let token = registered_address(&env);
    let curve = registered_address(&env);
    let mut params = make_params(&env, &token, &curve, "T", "T");
    params.max_supply = -1i128;
    assert!(client.try_create_token(&params).is_err());
    assert_eq!(client.get_token_count(), 0);
}

#[test]
fn test_get_tokens_paginated() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    client.create_token(&make_params(
        &env,
        &registered_address(&env),
        &registered_address(&env),
        "T1",
        "T1",
    ));
    client.create_token(&make_params(
        &env,
        &registered_address(&env),
        &registered_address(&env),
        "T2",
        "T2",
    ));
    let tokens = client.get_tokens_paginated(&0u64, &10u64);
    assert_eq!(tokens.len(), 2);
}

#[test]
fn test_create_token_returns_token_not_found_for_missing_address() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let missing = client.try_get_token(&generate_address(&env));
    assert_eq!(missing.unwrap_err().unwrap(), ContractError::TokenNotFound);
}
