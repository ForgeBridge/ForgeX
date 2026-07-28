use soroban_sdk::testutils;
use soroban_sdk::{Address, Env, String};

use crate::token::{TokenContract, TokenContractClient};

#[test]
fn test_initialize() {
    let env = Env::default();
    let admin = <Address as testutils::Address>::generate(&env);
    let contract_id = env.register(TokenContract, ());
    let client = TokenContractClient::new(&env, &contract_id);
    client.initialize(
        &admin,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "T"),
        &7u32,
        &1_000_000_000_000_0000i128,
    );
}
