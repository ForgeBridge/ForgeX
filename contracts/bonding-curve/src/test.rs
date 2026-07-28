use soroban_sdk::testutils;
use soroban_sdk::{Address, Env};

use crate::curve::{BondingCurveContract, BondingCurveContractClient};

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();
    let token_id = <Address as testutils::Address>::generate(&env);
    let admin = <Address as testutils::Address>::generate(&env);
    let contract_id = env.register(BondingCurveContract, ());
    let client = BondingCurveContractClient::new(&env, &contract_id);
    client.initialize(&token_id, &(), &admin);
}
