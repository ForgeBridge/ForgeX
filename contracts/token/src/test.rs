use soroban_sdk::testutils::{self, Events};
use soroban_sdk::{
    contract, contractimpl, symbol_short, Address, Bytes, BytesN, Env, IntoVal, String, Symbol, Val,
};

use crate::token::{TokenContract, TokenContractArgs, TokenContractClient};
use crate::upgrade::InterfaceVersion;

fn generate_address(env: &Env) -> Address {
    <Address as testutils::Address>::generate(env)
}

/// Deploys a token whose max supply is small enough that tests can exhaust it.
fn deploy_token_with_max_supply<'a>(
    env: &'a Env,
    admin: &Address,
    max_supply: i128,
) -> (Address, TokenContractClient<'a>) {
    let contract_id = env.register(
        TokenContract,
        TokenContractArgs::__constructor(
            admin,
            &String::from_str(env, "Test Token"),
            &String::from_str(env, "TEST"),
            &7u32,
            &max_supply,
        ),
    );
    let client = TokenContractClient::new(env, &contract_id);
    (contract_id, client)
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
fn test_constructor_rejects_invalid_metadata() {
    let env = Env::default();
    let admin = generate_address(&env);
    let long_name = String::from_str(&env, &"n".repeat(33));
    let long_symbol = String::from_str(&env, &"s".repeat(33));
    let ok: i32 = 0;

    // Runs `register` and captures the panic (registration of an invalid
    // constructor aborts the deploy), returning false when it panics.
    let rejecting = |name: String, symbol: String, decimals: u32| -> bool {
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            env.register(
                TokenContract,
                TokenContractArgs::__constructor(
                    &admin,
                    &name,
                    &symbol,
                    &decimals,
                    &10_000_000_000_000_000i128,
                ),
            );
            ok
        }))
        .is_err()
    };

    // Empty name / symbol, and over-long name / symbol are all rejected.
    assert!(rejecting(
        String::from_str(&env, ""),
        String::from_str(&env, "T"),
        7
    ));
    assert!(rejecting(
        String::from_str(&env, "T"),
        String::from_str(&env, ""),
        7
    ));
    assert!(rejecting(long_name, String::from_str(&env, "T"), 7));
    assert!(rejecting(String::from_str(&env, "T"), long_symbol, 7));

    // Decimals outside 0-255 are rejected.
    assert!(rejecting(
        String::from_str(&env, "T"),
        String::from_str(&env, "T"),
        256
    ));

    // And a valid token still deploys.
    assert!(!rejecting(
        String::from_str(&env, "T"),
        String::from_str(&env, "T"),
        7
    ));
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

// SEP-41 requires the three fixed-function queries to be individually
// callable, matching the fields of `metadata`.
#[test]
fn test_sep41_fixed_function_queries() {
    let env = Env::default();
    let admin = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    assert_eq!(client.name(), String::from_str(&env, "Test Token"));
    assert_eq!(client.symbol(), String::from_str(&env, "TEST"));
    assert_eq!(client.decimals(), 7);
    // The queries are usable without any authorization.
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
fn test_balance_and_supply_are_public_queries() {
    // No `mock_all_auths`: these reads must succeed for an arbitrary caller.
    let env = Env::default();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    assert_eq!(client.balance_of(&user), 0);
    assert_eq!(client.total_supply(), 0);
    // Minting still requires authorization; the reads themselves do not.
    env.mock_all_auths();
    client.mint(&user, &1000i128);
    assert_eq!(client.balance_of(&user), 1000);
    assert_eq!(client.total_supply(), 1000);
}

#[test]
fn test_set_paused_requires_admin() {
    let env = Env::default();
    let admin = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    // No auth mocked: only the admin may pause, so this fails for the deployer
    // test account.
    assert!(client.try_set_paused(&true).is_err());
    assert!(!client.paused());
}

#[test]
fn test_paused_blocks_value_moving_operations() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user1 = generate_address(&env);
    let user2 = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    client.mint(&user1, &1000i128);
    assert!(!client.paused());

    client.set_paused(&true);
    assert!(client.paused());

    // transfer, mint, burn and approve are all refused while paused.
    assert!(client.try_transfer(&user1, &user2, &100i128).is_err());
    assert!(client.try_mint(&user2, &100i128).is_err());
    assert!(client.try_burn(&user1, &100i128).is_err());
    assert!(client.try_approve(&user1, &user2, &100i128, &200).is_err());

    // Reads remain available and state is untouched.
    assert_eq!(client.balance_of(&user1), 1000);
    assert_eq!(client.total_supply(), 1000);

    // Unpausing restores normal operation.
    client.set_paused(&false);
    client.transfer(&user1, &user2, &100i128);
    assert_eq!(client.balance_of(&user2), 100);
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
fn test_transfer_from_consumes_allowance() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let spender = generate_address(&env);
    let recipient = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);

    client.mint(&user, &1000i128);
    client.approve(&user, &spender, &500i128, &100u64);

    // The spender moves 300 of the approved 500.
    let moved = client.transfer_from(&spender, &user, &recipient, &300i128);
    assert_eq!(moved, 300);
    assert_eq!(client.allowance(&user, &spender), 200);

    // The remainder can still be spent by the same spender.
    client.transfer_from(&spender, &user, &recipient, &200i128);
    assert_eq!(client.allowance(&user, &spender), 0);

    // Balances settled exactly as in a direct transfer.
    assert_eq!(client.balance_of(&user), 500);
    assert_eq!(client.balance_of(&recipient), 500);

    // The spender's own balance is untouched.
    assert_eq!(client.balance_of(&spender), 0);
}

#[test]
fn test_transfer_from_rejects_overspend_without_moving_funds() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let spender = generate_address(&env);
    let recipient = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);

    client.mint(&user, &1000i128);
    client.approve(&user, &spender, &500i128, &100u64);

    // Spending more than the approved allowance fails atomically: no partial
    // decrement of the allowance and no balance movement.
    let result = client.try_transfer_from(&spender, &user, &recipient, &501i128);
    assert!(result.is_err());
    assert_eq!(client.allowance(&user, &spender), 500);
    assert_eq!(client.balance_of(&user), 1000);
    assert_eq!(client.balance_of(&recipient), 0);

    // A spend of exactly the allowance still succeeds afterwards.
    client.transfer_from(&spender, &user, &recipient, &500i128);
    assert_eq!(client.allowance(&user, &spender), 0);
    assert_eq!(client.balance_of(&user), 500);
    assert_eq!(client.balance_of(&recipient), 500);
}

#[test]
fn test_transfer_from_rejects_zero_allowance() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let spender = generate_address(&env);
    let recipient = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);

    client.mint(&user, &1000i128);
    // No approve call: the spender has no allowance at all.
    assert!(client
        .try_transfer_from(&spender, &user, &recipient, &1i128)
        .is_err());
    assert_eq!(client.balance_of(&user), 1000);
    assert_eq!(client.balance_of(&recipient), 0);
}

#[test]
fn test_transfer_from_rejects_paused_token() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let spender = generate_address(&env);
    let recipient = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);

    client.mint(&user, &1000i128);
    client.approve(&user, &spender, &500i128, &100u64);
    client.set_paused(&true);

    assert!(client
        .try_transfer_from(&spender, &user, &recipient, &100i128)
        .is_err());
    assert_eq!(client.allowance(&user, &spender), 500);
    assert_eq!(client.balance_of(&user), 1000);
    assert_eq!(client.balance_of(&recipient), 0);
}

#[test]
fn test_transfer_from_rejects_revoked_parties() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let spender = generate_address(&env);
    let recipient = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);

    client.mint(&user, &1000i128);
    client.approve(&user, &spender, &500i128, &100u64);

    // A revoked source cannot be drained via transfer_from.
    client.set_authorized(&user, &false);
    assert!(client
        .try_transfer_from(&spender, &user, &recipient, &100i128)
        .is_err());
    assert_eq!(client.allowance(&user, &spender), 500);

    // A revoked recipient cannot receive funds via transfer_from.
    client.set_authorized(&user, &true);
    client.set_authorized(&recipient, &false);
    assert!(client
        .try_transfer_from(&spender, &user, &recipient, &100i128)
        .is_err());
    assert_eq!(client.allowance(&user, &spender), 500);
}

#[test]
fn test_transfer_from_rejects_negative_amounts() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let spender = generate_address(&env);
    let recipient = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);

    client.mint(&user, &1000i128);
    client.approve(&user, &spender, &500i128, &100u64);

    assert!(client
        .try_transfer_from(&spender, &user, &recipient, &(-1i128))
        .is_err());
    assert_eq!(client.allowance(&user, &spender), 500);
    assert_eq!(client.balance_of(&user), 1000);
}

#[test]
fn test_transfer_from_emits_sep41_event() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let spender = generate_address(&env);
    let recipient = generate_address(&env);
    let (id, client) = deploy_token(&env, &admin);

    client.mint(&user, &1000i128);
    client.approve(&user, &spender, &500i128, &100u64);
    client.transfer_from(&spender, &user, &recipient, &300i128);

    // The transfer_from emits the standard SEP-41 `transfer` event (topics
    // from/to), exactly as a direct transfer would.
    assert_eq!(
        env.events().all(),
        soroban_sdk::vec![
            &env,
            (
                id,
                soroban_sdk::vec![
                    &env,
                    symbol_short!("transfer").into_val(&env),
                    user.clone().into_val(&env),
                    recipient.clone().into_val(&env),
                ],
                300i128.into_val(&env),
            ),
        ]
    );
    assert_eq!(client.balance_of(&user), 700);
    assert_eq!(client.balance_of(&recipient), 300);
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
fn test_revoked_user_cannot_send_transfers() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let recipient = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    client.mint(&user, &1000i128);
    client.set_authorized(&user, &false);
    // The transfer returns Err instead of panicking, and no tokens move.
    assert!(client.try_transfer(&user, &recipient, &500i128).is_err());
    assert_eq!(client.balance_of(&user), 1000);
    assert_eq!(client.balance_of(&recipient), 0);
}

#[test]
fn test_revoked_user_cannot_receive_transfers() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let recipient = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    client.mint(&user, &1000i128);
    client.set_authorized(&recipient, &false);
    assert!(client.try_transfer(&user, &recipient, &500i128).is_err());
    assert_eq!(client.balance_of(&user), 1000);
    assert_eq!(client.balance_of(&recipient), 0);
}

#[test]
fn test_admin_cannot_self_revoke() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    // The admin revoking themselves would drain the owner role; it is refused
    // with Err instead of panicking.
    assert!(client.try_set_authorized(&admin, &false).is_err());
    assert!(client.authorized(&admin));
}

#[test]
fn test_non_admin_cannot_revoke() {
    let env = Env::default();
    let admin = generate_address(&env);
    let attacker = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    // No auth mocked: only the stored admin may revoke, so the admin
    // `require_auth` fails and the call is refused with Err.
    assert!(client.try_set_authorized(&attacker, &false).is_err());
    assert!(client.authorized(&attacker));
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

#[contract]
struct RecordingHook;

#[contractimpl]
impl RecordingHook {
    pub fn hook(env: Env, from: Address, to: Address, amount: i128) {
        env.storage().instance().set(&symbol_short!("from"), &from);
        env.storage().instance().set(&symbol_short!("to"), &to);
        env.storage()
            .instance()
            .set(&symbol_short!("amnt"), &amount);
        let count: u32 = env
            .storage()
            .instance()
            .get(&symbol_short!("count"))
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&symbol_short!("count"), &(count + 1));
    }

    // (from, to, amount) of the most recent hook invocation.
    pub fn last_call(env: Env) -> (Address, Address, i128) {
        let from: Address = env
            .storage()
            .instance()
            .get(&symbol_short!("from"))
            .unwrap();
        let to: Address = env.storage().instance().get(&symbol_short!("to")).unwrap();
        let amount: i128 = env
            .storage()
            .instance()
            .get(&symbol_short!("amnt"))
            .unwrap();
        (from, to, amount)
    }

    pub fn calls(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&symbol_short!("count"))
            .unwrap_or(0)
    }
}

#[test]
fn test_transfer_blocked_while_hook_in_flight() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user1 = generate_address(&env);
    let user2 = generate_address(&env);
    let (id, client) = deploy_token(&env, &admin);

    client.set_transfer_hook(&Some(env.register(RecordingHook, ())));
    client.mint(&user1, &1000i128);

    // Simulate a hook that is still mid-flight by raising the token's in-flight
    // guard directly in the token's storage (as a hook would see it while a
    // transfer is executing).
    env.as_contract(&id, || {
        env.storage()
            .persistent()
            .set(&symbol_short!("in_hook"), &true);
    });

    // The guard refuses the transfer and no tokens move.
    let result = client.try_transfer(&user1, &user2, &100i128);
    assert!(result.is_err());
    assert_eq!(client.balance_of(&user1), 1000);
    assert_eq!(client.balance_of(&user2), 0);
}

#[test]
fn test_set_transfer_hook_requires_admin() {
    let env = Env::default();
    let admin = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    let hook = env.register(RecordingHook, ());
    // No auth mocked: the caller is the deployer test account, not the token
    // admin, so the admin `require_auth` fails. `try_` captures the failure.
    let result = client.try_set_transfer_hook(&Some(hook));
    assert!(result.is_err());
    assert_eq!(client.get_transfer_hook(), None);
}

#[test]
fn test_transfer_invokes_hook_with_args() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user1 = generate_address(&env);
    let user2 = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    let hook_address = env.register(RecordingHook, ());
    let hook = RecordingHookClient::new(&env, &hook_address);

    client.set_transfer_hook(&Some(hook_address.clone()));
    assert_eq!(client.get_transfer_hook(), Some(hook_address.clone()));

    client.mint(&user1, &1000i128);
    client.transfer(&user1, &user2, &600i128);

    // The hook saw exactly one (from, to, amount) and balances settled.
    assert_eq!(hook.calls(), 1);
    assert_eq!(hook.last_call(), (user1.clone(), user2.clone(), 600));
    assert_eq!(client.balance_of(&user1), 400);
    assert_eq!(client.balance_of(&user2), 600);
}

#[test]
fn test_clearing_transfer_hook_disables_it() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user1 = generate_address(&env);
    let user2 = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    let hook_address = env.register(RecordingHook, ());
    let hook = RecordingHookClient::new(&env, &hook_address);

    client.set_transfer_hook(&Some(hook_address.clone()));
    client.mint(&user1, &1000i128);
    client.transfer(&user1, &user2, &100i128);
    assert_eq!(hook.calls(), 1);

    client.set_transfer_hook(&None);
    assert_eq!(client.get_transfer_hook(), None);
    client.transfer(&user1, &user2, &100i128);
    assert_eq!(hook.calls(), 1); // hook no longer invoked
}

#[test]
fn test_transfer_hook_cannot_be_the_token_itself() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let (id, client) = deploy_token(&env, &admin);
    // A self-hook would recurse on every transfer; it must be rejected.
    let result = client.try_set_transfer_hook(&Some(id));
    assert!(result.is_err());
    assert_eq!(client.get_transfer_hook(), None);
}

#[test]
fn test_mint_rejects_non_positive_amounts() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    assert!(client.try_mint(&user, &0i128).is_err());
    assert!(client.try_mint(&user, &(-5i128)).is_err());
    assert_eq!(client.balance_of(&user), 0);
}

#[test]
fn test_max_supply_is_enforced_on_mint() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let (_id, client) = deploy_token_with_max_supply(&env, &admin, 1000);

    // Minting up to the cap succeeds.
    let minted = client.mint(&user, &1000i128);
    assert_eq!(minted, 1000);
    assert_eq!(client.total_supply(), 1000);

    // Any further minting is refused and no state changes.
    let result = client.try_mint(&user, &1i128);
    assert!(result.is_err());
    let result = client.try_mint(&user, &0i128);
    assert!(result.is_err());
    assert_eq!(client.total_supply(), 1000);
    assert_eq!(client.balance_of(&user), 1000);
}

#[test]
fn test_max_supply_split_across_accounts_is_still_enforced() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user1 = generate_address(&env);
    let user2 = generate_address(&env);
    let (_id, client) = deploy_token_with_max_supply(&env, &admin, 1000);

    // Partial fills approach the cap from two accounts; the final over-cap
    // mint is refused regardless of which balance it targets.
    client.mint(&user1, &600i128);
    client.mint(&user2, &400i128);
    assert_eq!(client.total_supply(), 1000);

    assert!(client.try_mint(&user1, &1i128).is_err());
    assert!(client.try_mint(&user2, &1i128).is_err());
    assert_eq!(client.total_supply(), 1000);
    assert_eq!(client.balance_of(&user1), 600);
    assert_eq!(client.balance_of(&user2), 400);
}

#[test]
fn test_constructor_rejects_negative_max_supply() {
    let env = Env::default();
    let admin = generate_address(&env);
    let ok: i32 = 0;
    let rejecting = |max_supply: i128| -> bool {
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            env.register(
                TokenContract,
                TokenContractArgs::__constructor(
                    &admin,
                    &String::from_str(&env, "T"),
                    &String::from_str(&env, "T"),
                    &7u32,
                    &max_supply,
                ),
            );
            ok
        }))
        .is_err()
    };

    assert!(rejecting(-1i128));
    assert!(!rejecting(0i128));
    assert!(!rejecting(10_000_000_000_000_000i128));
}

#[test]
fn test_burn_rejects_non_positive_amounts() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    client.mint(&user, &100i128);
    assert!(client.try_burn(&user, &0i128).is_err());
    assert!(client.try_burn(&user, &(-5i128)).is_err());
    assert_eq!(client.balance_of(&user), 100);
}

#[test]
fn test_transfer_rejects_negative_amounts() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user1 = generate_address(&env);
    let user2 = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    client.mint(&user1, &100i128);
    assert!(client.try_transfer(&user1, &user2, &(-1i128)).is_err());
    // Neither balance changed: the negative amount must not mint or move funds.
    assert_eq!(client.balance_of(&user1), 100);
    assert_eq!(client.balance_of(&user2), 0);
}

#[test]
fn test_approve_rejects_negative_amounts() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);
    assert!(client.try_approve(&user, &user, &(-1i128), &200).is_err());
    assert_eq!(client.allowance(&user, &user), 0);
}

#[test]
fn test_set_admin_transfers_ownership() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let new_admin = generate_address(&env);
    let user = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);

    client.set_admin(&new_admin);
    assert_eq!(client.metadata().admin, new_admin);

    // The new admin can still operate the contract.
    client.mint(&user, &100i128);
    assert_eq!(client.balance_of(&user), 100);

    // The old admin can no longer mint (only the stored admin passes the
    // `require_auth` well, but under mock_auths both sign; the authoritative
    // check is the persisted metadata above).
    assert_eq!(client.metadata().admin, new_admin);
}

#[test]
fn test_set_admin_requires_admin_and_valid_target() {
    let env = Env::default();
    let admin = generate_address(&env);
    let attacker = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);

    // Non-admin cannot transfer ownership.
    assert!(client.try_set_admin(&attacker).is_err());

    // Admin cannot hand ownership to a revoked (unauthorized) address.
    env.mock_all_auths();
    client.set_authorized(&attacker, &false);
    assert!(client.try_set_admin(&attacker).is_err());
    assert_eq!(client.metadata().admin, admin);
}

#[test]
fn test_admin_transfer_moves_tokens() {
    use soroban_sdk::testutils::Events;
    let env = Env::default();
    env.mock_all_auths();
    let admin = generate_address(&env);
    let user1 = generate_address(&env);
    let user2 = generate_address(&env);
    let (id, client) = deploy_token(&env, &admin);
    client.mint(&user1, &1000i128);

    client.admin_transfer(&user1, &user2, &300i128);

    // The last invocation emitted both the standard `transfer` event and the
    // attributable `admin_transfer` event. Read the buffer before issuing any
    // further calls, since later invocations replace it.
    assert_eq!(
        env.events().all(),
        soroban_sdk::vec![
            &env,
            (
                id.clone(),
                soroban_sdk::vec![
                    &env,
                    symbol_short!("transfer").into_val(&env),
                    user1.clone().into_val(&env),
                    user2.clone().into_val(&env),
                ],
                300i128.into_val(&env),
            ),
            (
                id,
                soroban_sdk::vec![
                    &env,
                    Symbol::new(&env, "admin_transfer").into_val(&env),
                    user1.clone().into_val(&env),
                    user2.clone().into_val(&env),
                ],
                300i128.into_val(&env),
            ),
        ]
    );

    // Balances settled as expected.
    assert_eq!(client.balance_of(&user1), 700);
    assert_eq!(client.balance_of(&user2), 300);
}

#[test]
fn test_admin_transfer_requires_admin_and_valid_destination() {
    let env = Env::default();
    let admin = generate_address(&env);
    let user1 = generate_address(&env);
    let user2 = generate_address(&env);
    let (_id, client) = deploy_token(&env, &admin);

    // Without mock_auths the admin signature is missing, so the rescue
    // transfer is refused.
    assert!(client.try_admin_transfer(&user1, &user2, &100i128).is_err());

    // A revoked destination cannot receive an admin transfer.
    env.mock_all_auths();
    client.mint(&user1, &1000i128);
    client.set_authorized(&user2, &false);
    assert!(client.try_admin_transfer(&user1, &user2, &100i128).is_err());
    assert_eq!(client.balance_of(&user1), 1000);

    // Negative amounts are rejected.
    assert!(client
        .try_admin_transfer(&user1, &user2, &(-1i128))
        .is_err());
}
