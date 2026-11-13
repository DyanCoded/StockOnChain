#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    token::StellarAssetClient,
    Address, Env,
};

fn setup_pot_with_tokens<'a>(
    env: &'a Env,
) -> (
    StokvelPotContractClient<'a>,
    Address,                // admin
    Address,                // dealer
    Address,                // mzar_token
    Address,                // zatbill_token
    StellarAssetClient<'a>, // mzar_admin
    StellarAssetClient<'a>, // zatbill_admin
    u64,                    // maturity
) {
    let contract_id = env.register(StokvelPotContract, ());
    let client = StokvelPotContractClient::new(env, &contract_id);

    let admin = Address::generate(env);
    let dealer = Address::generate(env);
    let mzar_issuer = Address::generate(env);
    let zatbill_issuer = Address::generate(env);

    let mzar_token_addr = env.register_stellar_asset_contract_v2(mzar_issuer.clone());
    let zatbill_token_addr = env.register_stellar_asset_contract_v2(zatbill_issuer.clone());

    let mzar_client = StellarAssetClient::new(env, &mzar_token_addr.address());
    let zatbill_client = StellarAssetClient::new(env, &zatbill_token_addr.address());

    let now = 1_000_000u64;
    env.ledger().set_timestamp(now);

    let term_duration = 30 * 86400; // 30 days
    let maturity = now + term_duration;
    let member_cap = 1_000i128;
    let contribution_amount = 200i128;

    client.init(
        &admin,
        &dealer,
        &mzar_token_addr.address(),
        &zatbill_token_addr.address(),
        &term_duration,
        &maturity,
        &member_cap,
        &contribution_amount,
    );

    (
        client,
        admin,
        dealer,
        mzar_token_addr.address(),
        zatbill_token_addr.address(),
        mzar_client,
        zatbill_client,
        maturity,
    )
}

#[test]
fn test_happy_path_with_5_members() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, admin, dealer, mzar_addr, _, mzar_token, zatbill_token, maturity) =
        setup_pot_with_tokens(&env);

    // 1. Setup 5 members
    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env);
    let m3 = Address::generate(&env);
    let m4 = Address::generate(&env);
    let m5 = Address::generate(&env);
    let members = [m1.clone(), m2.clone(), m3.clone(), m4.clone(), m5.clone()];

    for m in members.iter() {
        assert_eq!(client.add_member(&admin, m), ());
        assert!(client.is_member(m));
        // Mint 1,000 mZAR to each member
        mzar_token.mint(m, &1000);
    }

    // 2. Each member contributes 200 mZAR (total = 1,000 mZAR)
    for m in members.iter() {
        assert_eq!(client.contribute(m, &200), 200);
        assert_eq!(client.get_member_shares(m), 200);
    }
    assert_eq!(client.get_total_contributions(), 1000);
    assert_eq!(client.get_total_shares(), 1000);
    assert_eq!(client.get_state(), PotState::Open);

    // 3. Investment: dealer provides 1,100 ZATBILL for 1,000 mZAR (10% discount)
    zatbill_token.mint(&dealer, &1100);
    assert_eq!(client.invest(&admin, &dealer, &1100), ());
    assert_eq!(client.get_state(), PotState::Invested);
    assert_eq!(client.get_zatbill_held(), 1100);
    assert_eq!(mzar_token.balance(&dealer), 1000);

    // 4. Maturity transition
    env.ledger().set_timestamp(maturity + 10);
    assert_eq!(client.get_state(), PotState::Matured);

    // 5. Settlement: Dealer returns 1,100 mZAR face value in exchange for ZATBILL
    mzar_token.mint(&dealer, &1100);
    assert_eq!(client.settle(&dealer), ());
    assert_eq!(client.get_state(), PotState::Settled);
    assert_eq!(client.get_settlement_total(), 1100);

    // 6. Each member claims pro-rata share:
    // (200 shares * 1100 total settlement) / 1000 total shares = 220 mZAR
    // Initial was 1,000 - 200 spent = 800. After claim: 800 + 220 = 1,020 mZAR!
    for m in members.iter() {
        assert!(!client.has_claimed(m));
        assert_eq!(client.claim(m), 220);
        assert!(client.has_claimed(m));
        assert_eq!(mzar_token.balance(m), 1020);
    }

    // Contract has 0 remaining payout obligations
    let mzar_token_client = soroban_sdk::token::Client::new(&env, &mzar_addr);
    assert_eq!(mzar_token_client.balance(&client.address), 0);
}

#[test]
fn test_revert_not_member() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _, _, _, _, mzar_token, _, _) = setup_pot_with_tokens(&env);

    let non_member = Address::generate(&env);
    mzar_token.mint(&non_member, &500);

    let res = client.try_contribute(&non_member, &100);
    assert_eq!(res, Err(Ok(Error::NotMember)));
}

#[test]
fn test_revert_over_cap() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, admin, _, _, _, mzar_token, _, _) = setup_pot_with_tokens(&env);

    let m1 = Address::generate(&env);
    client.add_member(&admin, &m1);
    mzar_token.mint(&m1, &2000);

    // Cap is 1,000. Contributing 1,001 should fail.
    let res = client.try_contribute(&m1, &1001);
    assert_eq!(res, Err(Ok(Error::OverCap)));

    // First contribute 800, then trying 300 more should fail.
    client.contribute(&m1, &800);
    let res2 = client.try_contribute(&m1, &300);
    assert_eq!(res2, Err(Ok(Error::OverCap)));
}

#[test]
fn test_revert_zero_amount() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, admin, _, _, _, _, _, _) = setup_pot_with_tokens(&env);

    let m1 = Address::generate(&env);
    client.add_member(&admin, &m1);

    let res = client.try_contribute(&m1, &0);
    assert_eq!(res, Err(Ok(Error::ZeroAmount)));

    let res_neg = client.try_contribute(&m1, &-50);
    assert_eq!(res_neg, Err(Ok(Error::ZeroAmount)));
}

#[test]
fn test_revert_paused() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, admin, _, _, _, mzar_token, _, _) = setup_pot_with_tokens(&env);

    let m1 = Address::generate(&env);
    client.add_member(&admin, &m1);
    mzar_token.mint(&m1, &500);

    client.pause(&admin);
    assert!(client.is_paused());

    let res = client.try_contribute(&m1, &100);
    assert_eq!(res, Err(Ok(Error::Paused)));

    // Unpause restores operations
    client.unpause(&admin);
    assert!(!client.is_paused());
    assert_eq!(client.contribute(&m1, &100), 100);
}

#[test]
fn test_revert_wrong_state_on_contribution() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, admin, dealer, _, _, mzar_token, zatbill_token, _) = setup_pot_with_tokens(&env);

    let m1 = Address::generate(&env);
    client.add_member(&admin, &m1);
    mzar_token.mint(&m1, &500);
    client.contribute(&m1, &200);

    zatbill_token.mint(&dealer, &250);
    client.invest(&admin, &dealer, &250);
    assert_eq!(client.get_state(), PotState::Invested);

    // Contributing after investment is rejected
    let res = client.try_contribute(&m1, &100);
    assert_eq!(res, Err(Ok(Error::WrongState)));
}

#[test]
fn test_revert_insufficient_backing() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, admin, dealer, _, _, mzar_token, zatbill_token, _) = setup_pot_with_tokens(&env);

    let m1 = Address::generate(&env);
    client.add_member(&admin, &m1);
    mzar_token.mint(&m1, &500);
    client.contribute(&m1, &500);

    // Total mZAR is 500. Providing only 499 ZATBILL violates backing verification limits!
    zatbill_token.mint(&dealer, &499);
    let res = client.try_invest(&admin, &dealer, &499);
    assert_eq!(res, Err(Ok(Error::InsufficientBacking)));
}

#[test]
fn test_revert_claims_before_maturity() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, admin, dealer, _, _, mzar_token, zatbill_token, maturity) =
        setup_pot_with_tokens(&env);

    let m1 = Address::generate(&env);
    client.add_member(&admin, &m1);
    mzar_token.mint(&m1, &500);
    client.contribute(&m1, &200);

    zatbill_token.mint(&dealer, &250);
    client.invest(&admin, &dealer, &250);

    // Attempting claim while timestamp < maturity should revert with NotMatured
    let res = client.try_claim(&m1);
    assert_eq!(res, Err(Ok(Error::NotMatured)));

    // Settle before maturity should also revert with NotMatured
    let res_settle = client.try_settle(&dealer);
    assert_eq!(res_settle, Err(Ok(Error::NotMatured)));

    // Fast-forward timestamp past maturity
    env.ledger().set_timestamp(maturity + 1);
    // Settle succeeds after maturity
    mzar_token.mint(&dealer, &250);
    assert_eq!(client.settle(&dealer), ());
    // Claim succeeds after settlement
    assert_eq!(client.claim(&m1), 250);
}

#[test]
fn test_revert_double_claim() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, admin, dealer, _, _, mzar_token, zatbill_token, maturity) =
        setup_pot_with_tokens(&env);

    let m1 = Address::generate(&env);
    client.add_member(&admin, &m1);
    mzar_token.mint(&m1, &500);
    client.contribute(&m1, &200);

    zatbill_token.mint(&dealer, &220);
    client.invest(&admin, &dealer, &220);

    env.ledger().set_timestamp(maturity + 1);
    mzar_token.mint(&dealer, &220);
    client.settle(&dealer);

    // First claim succeeds
    assert_eq!(client.claim(&m1), 220);

    // Duplicate claim reverts with AlreadyClaimed!
    let res_dup = client.try_claim(&m1);
    assert_eq!(res_dup, Err(Ok(Error::AlreadyClaimed)));
}

#[test]
fn test_revert_zero_balance_claim() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, admin, dealer, _, _, mzar_token, zatbill_token, maturity) =
        setup_pot_with_tokens(&env);

    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env); // m2 is added but contributes 0
    client.add_member(&admin, &m1);
    client.add_member(&admin, &m2);

    mzar_token.mint(&m1, &500);
    client.contribute(&m1, &200);

    zatbill_token.mint(&dealer, &220);
    client.invest(&admin, &dealer, &220);

    env.ledger().set_timestamp(maturity + 1);
    mzar_token.mint(&dealer, &220);
    client.settle(&dealer);

    // m2 has 0 shares -> ZeroBalance revert
    let res = client.try_claim(&m2);
    assert_eq!(res, Err(Ok(Error::ZeroBalance)));
}

#[test]
fn test_revert_already_member() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, admin, _, _, _, _, _, _) = setup_pot_with_tokens(&env);

    let m1 = Address::generate(&env);
    assert_eq!(client.add_member(&admin, &m1), ());

    let res = client.try_add_member(&admin, &m1);
    assert_eq!(res, Err(Ok(Error::AlreadyMember)));
}

#[test]
fn test_legacy_initialize_and_release() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(StokvelPotContract, ());
    let client = StokvelPotContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let issuer = Address::generate(&env);
    let dealer = Address::generate(&env);
    let custodian = Address::generate(&env);
    let sponsor = Address::generate(&env);
    let token = env.register_stellar_asset_contract_v2(issuer.clone());
    let token_client = soroban_sdk::token::StellarAssetClient::new(&env, &token.address());

    assert!(!client.is_initialized());
    client.initialize(&admin, &issuer, &dealer, &custodian, &sponsor);
    assert!(client.is_initialized());
    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_dealer(), dealer);
    assert_eq!(client.get_custodian(), custodian);
    assert_eq!(client.get_sponsor(), sponsor);

    client.set_zatbill_token(&admin, &token.address());
    token_client.mint(&contract_id, &100);
    client.release_zatbill(&custodian, &dealer, &40);

    assert_eq!(token_client.balance(&contract_id), 60);
    assert_eq!(token_client.balance(&dealer), 40);
}
