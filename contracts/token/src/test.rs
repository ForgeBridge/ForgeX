use soroban_sdk::testutils;
use soroban_sdk::{Address, Env, String};

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
