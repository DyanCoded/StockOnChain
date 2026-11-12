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

#[test]
fn custodian_can_release_zatbill_held_by_the_pot() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let issuer = Address::generate(&env);
    let dealer = Address::generate(&env);
    let custodian = Address::generate(&env);
    let sponsor = Address::generate(&env);
    let token = env.register_stellar_asset_contract_v2(issuer.clone());
    let token_client = soroban_sdk::token::StellarAssetClient::new(&env, &token.address());
    let contract_id = env.register(StokvelPotContract, ());
    let client = StokvelPotContractClient::new(&env, &contract_id);

    assert!(!client.is_initialized());
    client.initialize(&admin, &issuer, &dealer, &custodian, &sponsor);
    assert!(client.is_initialized());
    client.set_zatbill_token(&admin, &token.address());
    client.set_zatbill_token(&admin, &token.address());
    token_client.mint(&contract_id, &100);

    client.release_zatbill(&custodian, &dealer, &40);

    assert_eq!(token_client.balance(&contract_id), 60);
    assert_eq!(token_client.balance(&dealer), 40);
}
