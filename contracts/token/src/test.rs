use soroban_sdk::testutils::{self, Events};
use soroban_sdk::{symbol_short, vec, Address, Env, IntoVal, String, Symbol};

use crate::token::{TokenContract, TokenContractClient};

fn generate_address(env: &Env) -> Address {
    <Address as testutils::Address>::generate(env)
}

fn deploy_token<'a>(env: &'a Env, admin: &Address) -> (Address, TokenContractClient<'a>) {
    let contract_id = env.register(TokenContract, ());
    let client = TokenContractClient::new(env, &contract_id);
    client.initialize(
        admin,
        &String::from_str(env, "Test Token"),
        &String::from_str(env, "TEST"),
        &7u32,
        &10_000_000_000_000_000i128,
    );
    (contract_id, client)
}

#[test]
fn test_initialize() {
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
        vec![
            &env,
            (
                id,
                vec![
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
        vec![
            &env,
            (
                id,
                vec![
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
        vec![
            &env,
            (
                id,
                vec![
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
        vec![
            &env,
            (
                id,
                vec![
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
        vec![
            &env,
            (
                id,
                vec![
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
