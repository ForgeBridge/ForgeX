use soroban_sdk::testutils::{self, Events};
use soroban_sdk::{symbol_short, Address, Bytes, BytesN, Env, IntoVal, String, Symbol, Val};

use crate::token::{TokenContract, TokenContractArgs, TokenContractClient};
use crate::upgrade::InterfaceVersion;

fn generate_address(env: &Env) -> Address {
    <Address as testutils::Address>::generate(env)
}

fn deploy_token<'a>(env: &'a Env, admin: &Address) -> (Address, TokenContractClient<'a>) {
    let contract_id = env.register(
        TokenContract,
        TokenContractArgs::__constructor(
            admin,
            &String::from_str(env, "Test Token"),
            &String::from_str(env, "TEST"),
            &7u32,
            &10_000_000_000_000_000i128,
        ),
    );
    let client = TokenContractClient::new(env, &contract_id);
    (contract_id, client)
}

#[test]
fn test_constructor_initializes_metadata() {
    let env = Env::default();
    let admin = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    let meta = client.metadata();
    assert_eq!(meta.name, String::from_str(&env, "Test Token"));
    assert_eq!(meta.symbol, String::from_str(&env, "TEST"));
    assert_eq!(meta.decimals, 7);
}

#[test]
fn test_mint_and_balance() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    client.mint(&user, &1000i128);
    assert_eq!(client.balance_of(&user), 1000);
}

#[test]
fn test_transfer() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user1 = generate_address(&env);
    let user2 = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    client.mint(&user1, &1000i128);
    client.transfer(&user1, &user2, &500i128);
    assert_eq!(client.balance_of(&user1), 500);
    assert_eq!(client.balance_of(&user2), 500);
}

#[test]
fn test_burn() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    client.mint(&user, &1000i128);
    client.burn(&user, &400i128);
    assert_eq!(client.balance_of(&user), 600);
}

#[test]
fn test_approve_and_allowance() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let spender = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    client.mint(&user, &1000i128);
    client.approve(&user, &spender, &500i128, &100u64);
    assert_eq!(client.allowance(&user, &spender), 500);
}

#[test]
fn test_authorized_defaults_to_true() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    assert!(client.authorized(&user));
}

#[test]
fn test_set_authorized_revokes_and_restores() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);

    assert!(client.authorized(&user));
    client.set_authorized(&user, &false);
    assert!(!client.authorized(&user));
    client.set_authorized(&user, &true);
    assert!(client.authorized(&user));
}

#[test]
#[should_panic]
fn test_revoked_user_cannot_send_transfers() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let recipient = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    client.mint(&user, &1000i128);
    client.set_authorized(&user, &false);
    client.transfer(&user, &recipient, &500i128);
}

#[test]
#[should_panic]
fn test_revoked_user_cannot_receive_transfers() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let recipient = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    client.mint(&user, &1000i128);
    client.set_authorized(&recipient, &false);
    client.transfer(&user, &recipient, &500i128);
}

#[test]
#[should_panic]
fn test_admin_cannot_self_revoke() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    client.set_authorized(&admin, &false);
}

#[test]
#[should_panic]
fn test_non_admin_cannot_revoke() {
    let env = Env::default();
    let admin = generate_address(&env);
    let attacker = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    client.set_authorized(&attacker, &false);
}

#[test]
fn test_transfer_emits_sep41_event() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user1 = generate_address(&env);
    let user2 = generate_address(&env);
    let (id, client) = deploy_token(&env, &admin);
    client.mint(&user1, &1000i128);
    client.transfer(&user1, &user2, &600i128);
    // `env.events().all()` reflects the last invocation, so the event must be
    // asserted before issuing any further reads.
    assert_eq!(
        env.events().all(),
        soroban_sdk::vec![
            &env,
            (
                id,
                soroban_sdk::vec![
                    &env,
                    symbol_short!("transfer").into_val(&env),
                    user1.clone().into_val(&env),
                    user2.clone().into_val(&env),
                ],
                600i128.into_val(&env),
            ),
        ]
    );
    assert_eq!(client.balance_of(&user1), 400);
    assert_eq!(client.balance_of(&user2), 600);
}

#[test]
fn test_mint_emits_sep41_event() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let (id, client) = deploy_token(&env, &admin);
    client.mint(&user, &1000i128);
    assert_eq!(
        env.events().all(),
        soroban_sdk::vec![
            &env,
            (
                id,
                soroban_sdk::vec![
                    &env,
                    symbol_short!("mint").into_val(&env),
                    user.clone().into_val(&env),
                ],
                1000i128.into_val(&env),
            ),
        ]
    );
}

#[test]
fn test_burn_emits_sep41_event() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let (id, client) = deploy_token(&env, &admin);
    client.mint(&user, &1000i128);
    client.burn(&user, &300i128);
    assert_eq!(
        env.events().all(),
        soroban_sdk::vec![
            &env,
            (
                id,
                soroban_sdk::vec![
                    &env,
                    symbol_short!("burn").into_val(&env),
                    user.clone().into_val(&env),
                ],
                300i128.into_val(&env),
            ),
        ]
    );
}

#[test]
fn test_approve_emits_sep41_event() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let spender = generate_address(&env);
    let (id, client) = deploy_token(&env, &admin);
    client.mint(&user, &1000i128);
    client.approve(&user, &spender, &500i128, &100u64);
    assert_eq!(
        env.events().all(),
        soroban_sdk::vec![
            &env,
            (
                id,
                soroban_sdk::vec![
                    &env,
                    symbol_short!("approve").into_val(&env),
                    user.clone().into_val(&env),
                    spender.clone().into_val(&env),
                ],
                (500i128, 100u64).into_val(&env),
            ),
        ]
    );
}

#[test]
fn test_set_authorized_emits_event() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let (id, client) = deploy_token(&env, &admin);
    client.set_authorized(&user, &false);
    assert_eq!(
        env.events().all(),
        soroban_sdk::vec![
            &env,
            (
                id,
                soroban_sdk::vec![
                    &env,
                    Symbol::new(&env, "set_authorized").into_val(&env),
                    admin.clone().into_val(&env),
                    user.clone().into_val(&env),
                    false.into_val(&env),
                ],
                ().into_val(&env),
            ),
        ]
    );
}

#[test]
fn test_version_reports_interface_and_implementation() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    let version = client.version();
    assert_eq!(version.interface, 1);
    assert!(version.implementation >= 1);
}

#[test]
fn test_upgrade_requires_admin_auth() {
    let env = Env::default();
    let admin = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    let wasm_hash = BytesN::from_array(&env, &[1u8; 32]);
    // Without `mock_all_auths` the transaction is carried out by the deployer
    // test account, which is not the token admin, so the admin `require_auth`
    // fails. `try_` captures the failure instead of panicking.
    let result = client.try_upgrade(&wasm_hash);
    assert!(result.is_err());
}

#[test]
fn test_upgrade_bumps_implementation_version() {
    use soroban_sdk::xdr::{
        Limited, Limits, ScEnvMetaEntry, ScEnvMetaEntryInterfaceVersion, WriteXdr,
    };

    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (id, client) = deploy_token(&env, &admin);
    let before = client.version();

    // Encode the Soroban contract metadata xdr that every valid contract wasm
    // must carry (`contractenvmetav0` custom section).
    let entry = ScEnvMetaEntry::ScEnvMetaKindInterfaceVersion(ScEnvMetaEntryInterfaceVersion {
        protocol: 27,
        pre_release: 0,
    });
    let mut meta: Vec<u8> = Vec::new();
    entry
        .write_xdr(&mut Limited::new(&mut meta, Limits::none()))
        .unwrap();

    let name = b"contractenvmetav0";
    // Custom section layout: id byte, section size, then a name-length-prefixed
    // name followed by the opaque meta payload.
    let mut content: Vec<u8> = Vec::new();
    content.push(name.len() as u8);
    content.extend_from_slice(name);
    content.extend_from_slice(&meta);
    let mut wasm: Vec<u8> = vec![0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];
    wasm.push(0x00); // custom section id
    wasm.push((name.len() + meta.len() + 1) as u8); // section content length
    wasm.extend_from_slice(&content);
    let wasm_hash = env
        .deployer()
        .upload_contract_wasm(Bytes::from_slice(&env, &wasm));

    client.upgrade(&wasm_hash);

    // The upgraded executable is a minimal stub wasm, so we read the newly
    // stored version directly from the contract's instance storage instead of
    // invoking a method on the stub.
    let stored: InterfaceVersion = env.as_contract(&id, || {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "token_version"))
            .unwrap()
    });
    assert_eq!(stored.interface, before.interface);
    assert_eq!(stored.implementation, before.implementation + 1);
}

#[test]
fn test_token_cannot_be_reinitialized_via_public_entry_point() {
    // The constructor runs once at deploy time and `initialize` no longer
    // exists, so a post-deploy "re-initialization" entry point is absent.
    // Verify that:
    // 1. metadata matches exactly what the constructor stored, and
    // 2. invoking the old `initialize` function by raw symbol fails, proving
    //    it cannot be used to overwrite admin/name/symbol after deployment.
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (id, _client) = deploy_token(&env, &admin);

    let meta = TokenContractClient::new(&env, &id).metadata();
    assert_eq!(meta.admin, admin);
    assert_eq!(meta.name, String::from_str(&env, "Test Token"));
    assert_eq!(meta.symbol, String::from_str(&env, "TEST"));
    assert_eq!(meta.decimals, 7);
    assert_eq!(meta.max_supply, 10_000_000_000_000_000i128);

    let result: Result<
        Result<Val, soroban_sdk::ConversionError>,
        Result<soroban_sdk::Error, soroban_sdk::InvokeError>,
    > = env.try_invoke_contract(
        &id,
        &Symbol::new(&env, "initialize"),
        soroban_sdk::vec![
            &env,
            admin.clone().into_val(&env),
            String::from_str(&env, "ForgeX").into_val(&env),
            String::from_str(&env, "FX").into_val(&env),
            6u32.into_val(&env),
            1000i128.into_val(&env)
        ],
    );
    assert!(result.is_err());
}
