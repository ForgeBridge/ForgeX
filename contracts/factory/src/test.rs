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
    assert_eq!(
        client.try_create_token(&params).unwrap_err().unwrap(),
        ContractError::InvalidMetadata
    );
    assert_eq!(client.get_token_count(), 0);
}

#[test]
fn test_create_token_rejects_oversized_image_uri_and_description() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let token = registered_address(&env);
    let curve = registered_address(&env);

    let mut long_image = make_params(&env, &token, &curve, "T", "T");
    long_image.image_uri = String::from_str(&env, &"x".repeat(256));
    let result = client.try_create_token(&long_image);
    assert_eq!(result.unwrap_err().unwrap(), ContractError::InvalidMetadata);

    let mut long_description = make_params(&env, &token, &curve, "T", "T");
    long_description.description = String::from_str(&env, &"x".repeat(1025));
    let result = client.try_create_token(&long_description);
    assert_eq!(result.unwrap_err().unwrap(), ContractError::InvalidMetadata);

    // The 255-byte and 1024-byte maxima are still accepted.
    let mut max_image = make_params(
        &env,
        &registered_address(&env),
        &registered_address(&env),
        "MaxImage",
        "T1",
    );
    max_image.image_uri = String::from_str(&env, &"x".repeat(255));
    let mut max_description = make_params(
        &env,
        &registered_address(&env),
        &registered_address(&env),
        "MaxDescription",
        "T2",
    );
    max_description.description = String::from_str(&env, &"x".repeat(1024));
    assert!(client.try_create_token(&max_image).is_ok());
    assert!(client.try_create_token(&max_description).is_ok());
    assert_eq!(client.get_token_count(), 2);
}

#[test]
fn test_create_token_rejects_invalid_curve_params() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let token = registered_address(&env);
    let curve = registered_address(&env);

    let base = || make_params(&env, &token, &curve, "T", "T");

    let mut zero_price = base();
    zero_price.curve_params.initial_price = 0;
    assert_eq!(
        client.try_create_token(&zero_price).unwrap_err().unwrap(),
        ContractError::InvalidCurveParams
    );

    let mut negative_price = base();
    negative_price.curve_params.initial_price = -1;
    assert_eq!(
        client
            .try_create_token(&negative_price)
            .unwrap_err()
            .unwrap(),
        ContractError::InvalidCurveParams
    );

    let mut zero_steepness = base();
    zero_steepness.curve_params.steepness = 0;
    assert_eq!(
        client
            .try_create_token(&zero_steepness)
            .unwrap_err()
            .unwrap(),
        ContractError::InvalidCurveParams
    );

    let mut negative_reserve = base();
    negative_reserve.curve_params.reserve_target = -1;
    assert_eq!(
        client
            .try_create_token(&negative_reserve)
            .unwrap_err()
            .unwrap(),
        ContractError::InvalidCurveParams
    );

    // Nothing was recorded.
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
fn test_get_token_by_name() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let token = registered_address(&env);
    let curve = registered_address(&env);
    client.create_token(&make_params(&env, &token, &curve, "Alpha", "ALPHA"));

    let found = client.get_token_by_name(&String::from_str(&env, "Alpha"));
    assert_eq!(found.token_id, token);
    assert_eq!(found.curve_id, curve);

    assert_eq!(
        client
            .try_get_token_by_name(&String::from_str(&env, "Unknown"))
            .unwrap_err()
            .unwrap(),
        ContractError::TokenNotFound
    );
}

#[test]
fn test_get_token_by_symbol() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let token = registered_address(&env);
    let curve = registered_address(&env);
    client.create_token(&make_params(&env, &token, &curve, "Alpha", "ALPHA"));

    let found = client.get_token_by_symbol(&String::from_str(&env, "ALPHA"));
    assert_eq!(found.token_id, token);

    assert_eq!(
        client
            .try_get_token_by_symbol(&String::from_str(&env, "ZZZ"))
            .unwrap_err()
            .unwrap(),
        ContractError::TokenNotFound
    );
}

#[test]
fn test_get_admin_returns_initialized_admin() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    assert_eq!(client.get_admin(), admin);
}

#[test]
fn test_initialize_rejects_reinitialization() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let other = generate_address(&env);
    assert_eq!(
        client.try_initialize(&other).unwrap_err().unwrap(),
        ContractError::AlreadyInitialized
    );
    // The original admin is untouched.
    assert_eq!(client.get_admin(), admin);
}

#[test]
fn test_set_admin_transfers_ownership() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (id, client) = deploy_factory(&env, &admin);
    let new_admin = registered_address(&env);

    client.set_admin(&new_admin);

    // An AdminChanged event records the handover: topics [AdminChanged, old,
    // new], empty data payload.
    assert_eq!(
        env.events().all(),
        soroban_sdk::vec![
            &env,
            (
                id,
                soroban_sdk::vec![
                    &env,
                    Symbol::new(&env, "AdminChanged").into_val(&env),
                    admin.into_val(&env),
                    new_admin.into_val(&env),
                ],
                ().into_val(&env),
            ),
        ]
    );

    assert_eq!(client.get_admin(), new_admin);
}

#[test]
fn test_set_admin_rejects_non_existent_address() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    assert_eq!(
        client
            .try_set_admin(&generate_address(&env))
            .unwrap_err()
            .unwrap(),
        ContractError::InvalidAdminAddress
    );
    assert_eq!(client.get_admin(), admin);
}

#[test]
fn test_admin_only_operations_require_admin_auth() {
    let env = Env::default();
    // No mock_all_auths: the caller is the deployer test account, not the
    // factory admin, so the admin `require_auth` fails and the `try_` call
    // captures the failure.
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);

    let params = make_params(
        &env,
        &registered_address(&env),
        &registered_address(&env),
        "Alpha",
        "ALPHA",
    );
    assert!(client.try_create_token(&params).is_err());
    assert!(client.try_set_admin(&registered_address(&env)).is_err());
}

#[test]
fn test_token_count_tracks_registrations() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    assert_eq!(client.get_token_count(), 0);

    client.create_token(&make_params(
        &env,
        &registered_address(&env),
        &registered_address(&env),
        "Alpha",
        "ALPHA",
    ));
    client.create_token(&make_params(
        &env,
        &registered_address(&env),
        &registered_address(&env),
        "Beta",
        "BETA",
    ));
    client.create_token(&make_params(
        &env,
        &registered_address(&env),
        &registered_address(&env),
        "Gamma",
        "GAMMA",
    ));
    assert_eq!(client.get_token_count(), 3);

    // A rejected duplicate does not move the count.
    let dup = make_params(
        &env,
        &registered_address(&env),
        &registered_address(&env),
        "Alpha",
        "OTHER",
    );
    assert!(client.try_create_token(&dup).is_err());
    assert_eq!(client.get_token_count(), 3);
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
