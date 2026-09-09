use soroban_sdk::testutils::{self, Events, MockAuth, MockAuthInvoke};
use soroban_sdk::{Address, Env, IntoVal, String, Symbol};

use crate::error::ContractError;
use crate::factory::{
    CreateTokenParams, CurveParams, FactoryContract, FactoryContractClient, TokenInfo,
};

/// Real WASM blobs, built via `./scripts/build-contracts.sh`. The factory
/// deploys these in `create_token`, so the tests exercise genuine
/// cross-contract deployment (token constructor + curve initialization).
const TOKEN_WASM: &[u8] = include_bytes!("../../../target/wasm32v1-none/release/forgex_token.wasm");
const CURVE_WASM: &[u8] =
    include_bytes!("../../../target/wasm32v1-none/release/forgex_bonding_curve.wasm");

fn deploy_factory<'a>(env: &'a Env, admin: &Address) -> (Address, FactoryContractClient<'a>) {
    let contract_id: Address = env.register(FactoryContract, ());
    let token_wasm = env.deployer().upload_contract_wasm(TOKEN_WASM);
    let curve_wasm = env.deployer().upload_contract_wasm(CURVE_WASM);
    let client = FactoryContractClient::new(env, &contract_id);
    client.initialize(admin, &token_wasm, &curve_wasm);
    (contract_id, client)
}

fn generate_address(env: &Env) -> Address {
    <Address as testutils::Address>::generate(env)
}

/// Registers a live contract so the returned address verifiably exists in the
/// ledger (used for admin handovers, not for tokens — those are deployed by
/// the factory itself).
fn registered_address(env: &Env) -> Address {
    env.register(FactoryContract, ())
}

fn make_params(env: &Env, name: &str, symbol: &str) -> CreateTokenParams {
    CreateTokenParams {
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
    let (id, client) = deploy_factory(&env, &admin);
    assert_eq!(client.get_admin(), admin);
    // The trusted WASM hashes were stored at initialization.
    let token_wasm = env.deployer().upload_contract_wasm(TOKEN_WASM);
    let curve_wasm = env.deployer().upload_contract_wasm(CURVE_WASM);
    assert_eq!(client.get_token_wasm(), token_wasm);
    assert_eq!(client.get_curve_wasm(), curve_wasm);
    let _ = id;
}

#[test]
fn test_create_token_deploys_and_registers() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    // Any user — not just the factory admin — may forge a token.
    let user = generate_address(&env);
    let params = make_params(&env, "Test Token", "TEST");
    let (token_id, curve_id) = client.create_token(&user, &params);

    // Fresh, distinct, live contracts were deployed.
    assert_ne!(token_id, curve_id);
    assert!(token_id.exists());
    assert!(curve_id.exists());
    assert_eq!(client.get_token_count(), 1);

    // The registry records the true forger with the deployed addresses.
    let stored = client.get_token(&token_id);
    assert_eq!(stored.token_id, token_id);
    assert_eq!(stored.curve_id, curve_id);
    assert_eq!(stored.creator, user);
    assert_eq!(stored.name, String::from_str(&env, "Test Token"));
    assert_eq!(stored.symbol, String::from_str(&env, "TEST"));
}

#[test]
fn test_create_token_initializes_deployed_contracts() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let user = generate_address(&env);
    let (token_id, curve_id) = client.create_token(&user, &make_params(&env, "Live", "LIVE"));

    // The token constructor ran with the forged metadata.
    let decimals: u32 = env.invoke_contract(
        &token_id,
        &Symbol::new(&env, "decimals"),
        soroban_sdk::vec![&env],
    );
    assert_eq!(decimals, 7);
    let symbol: String = env.invoke_contract(
        &token_id,
        &Symbol::new(&env, "symbol"),
        soroban_sdk::vec![&env],
    );
    assert_eq!(symbol, String::from_str(&env, "LIVE"));

    // The curve was initialized for the new token with the forged params:
    // price at zero supply equals the initial price.
    let price: i128 = env.invoke_contract(
        &curve_id,
        &Symbol::new(&env, "get_price"),
        soroban_sdk::vec![&env],
    );
    assert_eq!(price, 100);
}

#[test]
fn test_create_token_addresses_are_unique_across_forges() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let user = generate_address(&env);

    let (token_a, curve_a) = client.create_token(&user, &make_params(&env, "Alpha", "ALPHA"));
    let (token_b, curve_b) = client.create_token(&user, &make_params(&env, "Beta", "BETA"));

    assert_ne!(token_a, token_b);
    assert_ne!(curve_a, curve_b);
    assert_eq!(client.get_token_count(), 2);
}

#[test]
fn test_create_token_after_removal_redeploys_fresh_addresses() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let user = generate_address(&env);

    let (token_a, curve_a) = client.create_token(&user, &make_params(&env, "Alpha", "ALPHA"));
    client.remove_token(&token_a);
    assert_eq!(client.get_token_count(), 0);

    // The deployment nonce never rewinds, so re-forging (even in the same
    // ledger) cannot collide with the removed token's addresses.
    let (token_b, curve_b) = client.create_token(&user, &make_params(&env, "Beta", "BETA"));
    assert_ne!(token_a, token_b);
    assert_ne!(curve_a, curve_b);
    assert!(client.has_token(&token_b));
}

#[test]
fn test_token_created_emits_full_details() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (id, client) = deploy_factory(&env, &admin);
    let creator = generate_address(&env);
    let params = make_params(&env, "Test Token", "TEST");
    let (token_id, curve_id) = client.create_token(&creator, &params);

    let expected = TokenInfo {
        token_id: token_id.clone(),
        curve_id: curve_id.clone(),
        creator: creator.clone(),
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
                    creator.clone().into_val(&env),
                    token_id.clone().into_val(&env),
                ],
                expected.into_val(&env),
            ),
        ]
    );
}

#[test]
fn test_create_token_rejects_duplicate_by_name() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);

    client.create_token(&admin, &make_params(&env, "Alpha", "ALPHA"));

    // Different symbol, same name.
    let dup = make_params(&env, "Alpha", "BETA");
    let result = client.try_create_token(&admin, &dup);
    assert_eq!(result.unwrap_err().unwrap(), ContractError::TokenExists);
    assert_eq!(client.get_token_count(), 1);
}

#[test]
fn test_create_token_rejects_duplicate_by_symbol() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);

    client.create_token(&admin, &make_params(&env, "Alpha", "ALPHA"));

    // Different name, same symbol.
    let dup = make_params(&env, "Beta", "ALPHA");
    let result = client.try_create_token(&admin, &dup);
    assert_eq!(result.unwrap_err().unwrap(), ContractError::TokenExists);
    assert_eq!(client.get_token_count(), 1);
}

#[test]
fn test_create_token_rejects_invalid_metadata() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);

    assert!(client
        .try_create_token(&admin, &make_params(&env, "", "T"))
        .is_err());
    assert!(client
        .try_create_token(&admin, &make_params(&env, "T", ""))
        .is_err());
    assert!(client
        .try_create_token(&admin, &make_params(&env, &"n".repeat(33), "T"))
        .is_err());
    assert!(client
        .try_create_token(&admin, &make_params(&env, "T", &"s".repeat(33)))
        .is_err());

    let mut invalid_decimals = make_params(&env, "T", "T");
    invalid_decimals.decimals = 256;
    assert!(client.try_create_token(&admin, &invalid_decimals).is_err());

    // Nothing was deployed or recorded.
    assert_eq!(client.get_token_count(), 0);
}

#[test]
fn test_create_token_rejects_negative_max_supply() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let mut params = make_params(&env, "T", "T");
    params.max_supply = -1i128;
    assert_eq!(
        client
            .try_create_token(&admin, &params)
            .unwrap_err()
            .unwrap(),
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

    let mut long_image = make_params(&env, "T", "T");
    long_image.image_uri = String::from_str(&env, &"x".repeat(256));
    let result = client.try_create_token(&admin, &long_image);
    assert_eq!(result.unwrap_err().unwrap(), ContractError::InvalidMetadata);

    let mut long_description = make_params(&env, "T", "T");
    long_description.description = String::from_str(&env, &"x".repeat(1025));
    let result = client.try_create_token(&admin, &long_description);
    assert_eq!(result.unwrap_err().unwrap(), ContractError::InvalidMetadata);

    // The 255-byte and 1024-byte maxima are still accepted.
    let mut max_image = make_params(&env, "MaxImage", "T1");
    max_image.image_uri = String::from_str(&env, &"x".repeat(255));
    let mut max_description = make_params(&env, "MaxDescription", "T2");
    max_description.description = String::from_str(&env, &"x".repeat(1024));
    assert!(client.try_create_token(&admin, &max_image).is_ok());
    assert!(client.try_create_token(&admin, &max_description).is_ok());
    assert_eq!(client.get_token_count(), 2);
}

#[test]
fn test_create_token_rejects_invalid_curve_params() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);

    let base = || make_params(&env, "T", "T");

    let mut zero_price = base();
    zero_price.curve_params.initial_price = 0;
    assert_eq!(
        client
            .try_create_token(&admin, &zero_price)
            .unwrap_err()
            .unwrap(),
        ContractError::InvalidCurveParams
    );

    let mut negative_price = base();
    negative_price.curve_params.initial_price = -1;
    assert_eq!(
        client
            .try_create_token(&admin, &negative_price)
            .unwrap_err()
            .unwrap(),
        ContractError::InvalidCurveParams
    );

    let mut zero_steepness = base();
    zero_steepness.curve_params.steepness = 0;
    assert_eq!(
        client
            .try_create_token(&admin, &zero_steepness)
            .unwrap_err()
            .unwrap(),
        ContractError::InvalidCurveParams
    );

    let mut negative_reserve = base();
    negative_reserve.curve_params.reserve_target = -1;
    assert_eq!(
        client
            .try_create_token(&admin, &negative_reserve)
            .unwrap_err()
            .unwrap(),
        ContractError::InvalidCurveParams
    );

    // Nothing was deployed or recorded.
    assert_eq!(client.get_token_count(), 0);
}

#[test]
fn test_create_token_is_permissionless_non_admin_can_forge() {
    let env = Env::default();
    let admin = generate_address(&env);
    let (id, client) = deploy_factory(&env, &admin);
    // A regular user authorizes as itself — never as the factory admin.
    let creator = generate_address(&env);
    let params = make_params(&env, "Community", "COMM");
    env.mock_auths(&[MockAuth {
        address: &creator,
        invoke: &MockAuthInvoke {
            contract: &id,
            fn_name: "create_token",
            args: (creator.clone(), params.clone()).into_val(&env),
            sub_invokes: &[],
        },
    }]);
    let (token_id, curve_id) = client.create_token(&creator, &params);
    assert!(token_id.exists());
    assert!(curve_id.exists());
    assert_eq!(client.get_token(&token_id).creator, creator);
    assert_eq!(client.get_token_count(), 1);
}

#[test]
fn test_create_token_requires_creator_auth() {
    let env = Env::default();
    // No mock_all_auths: nobody authorizes as `creator`, so the
    // `creator.require_auth()` fails and the `try_` call captures it.
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);

    let params = make_params(&env, "Alpha", "ALPHA");
    assert!(client.try_create_token(&admin, &params).is_err());
    assert_eq!(client.get_token_count(), 0);
}

#[test]
fn test_pagination_preserves_creation_order() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);

    let names = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"];
    for (i, name) in names.iter().enumerate() {
        client.create_token(&admin, &make_params(&env, name, &format!("S{i}")));
    }

    let all = client.get_all_tokens();
    assert_eq!(all.len(), 5);
    for (i, name) in names.iter().enumerate() {
        assert_eq!(
            all.get(i as u32).unwrap().name,
            String::from_str(&env, name)
        );
    }

    // Paging with any window size reproduces the full creation order when
    // concatenated.
    let mut paged: soroban_sdk::Vec<crate::factory::TokenInfo> = soroban_sdk::Vec::new(&env);
    for offset in [0u64, 2u64, 4u64] {
        let page = client.get_tokens_paginated(&offset, &2u64);
        for record in page {
            paged.push_back(record);
        }
    }
    assert_eq!(paged, all);
}

#[test]
fn test_pagination_is_stable_across_window_sizes() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);

    let names = ["A", "B", "C", "D", "E", "F", "G"];
    for (i, name) in names.iter().enumerate() {
        client.create_token(&admin, &make_params(&env, name, &format!("S{i}")));
    }

    // The whole registry, paged one-at-a-time, matches the whole registry
    // paged all-at-once: ordering does not depend on the window size.
    let all = client.get_all_tokens();
    let mut first_of_each_page: soroban_sdk::Vec<crate::factory::TokenInfo> =
        soroban_sdk::Vec::new(&env);
    for i in 0u64..7 {
        let page = client.get_tokens_paginated(&i, &1u64);
        assert_eq!(page.len(), 1);
        first_of_each_page.push_back(page.get(0).unwrap());
    }
    assert_eq!(first_of_each_page, all);
}

#[test]
fn test_get_tokens_paginated_out_of_range() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    client.create_token(&admin, &make_params(&env, "T1", "T1"));
    client.create_token(&admin, &make_params(&env, "T2", "T2"));

    // Offset beyond the end yields an empty page; a window crossing the end is
    // saturated to the registry tail.
    assert_eq!(client.get_tokens_paginated(&10u64, &2u64).len(), 0);
    assert_eq!(client.get_tokens_paginated(&1u64, &5u64).len(), 1);
}

#[test]
fn test_remove_token() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let (first, _) = client.create_token(&admin, &make_params(&env, "Alpha", "ALPHA"));
    let (second, _) = client.create_token(&admin, &make_params(&env, "Beta", "BETA"));
    let (third, _) = client.create_token(&admin, &make_params(&env, "Gamma", "GAMMA"));
    assert_eq!(client.get_token_count(), 3);

    client.remove_token(&second);
    assert_eq!(client.get_token_count(), 2);
    assert!(!client.has_token(&second));
    assert_eq!(
        client.try_get_token(&second).unwrap_err().unwrap(),
        ContractError::TokenNotFound
    );
    assert!(client.has_token(&first));
    assert!(client.has_token(&third));

    // The remaining records keep their creation order.
    let remaining = client.get_all_tokens();
    assert_eq!(remaining.len(), 2);
    assert_eq!(
        remaining.get(0).unwrap().name,
        String::from_str(&env, "Alpha")
    );
    assert_eq!(
        remaining.get(1).unwrap().name,
        String::from_str(&env, "Gamma")
    );
}

#[test]
fn test_remove_token_unknown() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    assert_eq!(
        client
            .try_remove_token(&registered_address(&env))
            .unwrap_err()
            .unwrap(),
        ContractError::TokenNotFound
    );
}

#[test]
fn test_remove_token_requires_admin_auth() {
    let env = Env::default();
    // No mock_all_auths: the caller is the deployer test account, not the
    // factory admin, so the admin `require_auth` fails.
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    assert!(client.try_remove_token(&registered_address(&env)).is_err());
}

#[test]
fn test_has_token() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let unknown = registered_address(&env);

    assert!(!client.has_token(&unknown));

    let (token, _) = client.create_token(&admin, &make_params(&env, "Alpha", "ALPHA"));

    assert!(client.has_token(&token));
    assert!(!client.has_token(&unknown));
}

#[test]
fn test_get_token_by_name() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let (token, curve) = client.create_token(&admin, &make_params(&env, "Alpha", "ALPHA"));

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
    let (token, _) = client.create_token(&admin, &make_params(&env, "Alpha", "ALPHA"));

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
    let token_wasm = env.deployer().upload_contract_wasm(TOKEN_WASM);
    let curve_wasm = env.deployer().upload_contract_wasm(CURVE_WASM);
    assert_eq!(
        client
            .try_initialize(&other, &token_wasm, &curve_wasm)
            .unwrap_err()
            .unwrap(),
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
fn test_set_wasm_hashes_require_admin_auth() {
    let env = Env::default();
    // No mock_all_auths: the caller is not the factory admin, so both
    // setters fail closed.
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    let wasm = env.deployer().upload_contract_wasm(TOKEN_WASM);
    assert!(client.try_set_token_wasm(&wasm).is_err());
    assert!(client.try_set_curve_wasm(&wasm).is_err());
}

#[test]
fn test_set_wasm_hashes_update_future_deployments() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);

    // Re-setting the same known-good hashes is accepted and observable.
    let token_wasm = env.deployer().upload_contract_wasm(TOKEN_WASM);
    let curve_wasm = env.deployer().upload_contract_wasm(CURVE_WASM);
    client.set_token_wasm(&token_wasm);
    client.set_curve_wasm(&curve_wasm);
    assert_eq!(client.get_token_wasm(), token_wasm);
    assert_eq!(client.get_curve_wasm(), curve_wasm);

    // Forging still works after the rotation.
    let (token_id, curve_id) = client.create_token(&admin, &make_params(&env, "Rotated", "ROT"));
    assert!(token_id.exists());
    assert!(curve_id.exists());
}

#[test]
fn test_set_admin_requires_admin_auth() {
    let env = Env::default();
    // No mock_all_auths: the caller is the deployer test account, not the
    // factory admin, so the admin `require_auth` fails and the `try_` call
    // captures the failure.
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);

    assert!(client.try_set_admin(&registered_address(&env)).is_err());
}

#[test]
fn test_token_count_tracks_registrations() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_factory(&env, &admin);
    assert_eq!(client.get_token_count(), 0);

    client.create_token(&admin, &make_params(&env, "Alpha", "ALPHA"));
    client.create_token(&admin, &make_params(&env, "Beta", "BETA"));
    client.create_token(&admin, &make_params(&env, "Gamma", "GAMMA"));
    assert_eq!(client.get_token_count(), 3);

    // A rejected duplicate does not move the count.
    let dup = make_params(&env, "Alpha", "OTHER");
    assert!(client.try_create_token(&admin, &dup).is_err());
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
