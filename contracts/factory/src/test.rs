use soroban_sdk::testutils;
use soroban_sdk::{Address, Env};

use crate::factory::{FactoryContract, FactoryContractClient};

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = <Address as testutils::Address>::generate(&env);
    let contract_id = env.register(FactoryContract, ());
    let client = FactoryContractClient::new(&env, &contract_id);
    client.initialize(&admin);
}
