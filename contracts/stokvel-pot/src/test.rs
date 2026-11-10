#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_initialize_and_get_roles() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(StokvelPotContract, ());
    let client = StokvelPotContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let issuer = Address::generate(&env);
    let dealer = Address::generate(&env);
    let custodian = Address::generate(&env);
    let sponsor = Address::generate(&env);

    client.initialize(&admin, &issuer, &dealer, &custodian, &sponsor);

    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_issuer(), issuer);
    assert_eq!(client.get_dealer(), dealer);
    assert_eq!(client.get_custodian(), custodian);
    assert_eq!(client.get_sponsor(), sponsor);
    assert_eq!(
        client.version(),
        String::from_str(&env, "0.1.0-stokvel-pot")
    );
}

#[test]
fn test_hello() {
    let env = Env::default();
    let contract_id = env.register(StokvelPotContract, ());
    let client = StokvelPotContractClient::new(&env, &contract_id);

    let greeting = client.hello(&String::from_str(&env, "world"));
    assert_eq!(greeting.len(), 2);
    assert_eq!(greeting.get(0), Some(String::from_str(&env, "Hello")));
    assert_eq!(greeting.get(1), Some(String::from_str(&env, "world")));
}
