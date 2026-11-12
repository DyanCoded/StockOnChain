#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Issuer,
    Dealer,
    Custodian,
    Sponsor,
    ZatbillToken,
    Initialized,
}

#[contract]
pub struct StokvelPotContract;

#[contractimpl]
impl StokvelPotContract {
    /// Return a greeting for the supplied name.
    pub fn hello(env: Env, to: String) -> soroban_sdk::Vec<String> {
        let mut result = soroban_sdk::Vec::new(&env);
        result.push_back(String::from_str(&env, "Hello"));
        result.push_back(to);
        result
    }

    /// Initialize the Stokvel Pot contract with ecosystem roles.
    pub fn initialize(
        env: Env,
        admin: Address,
        issuer: Address,
        dealer: Address,
        custodian: Address,
        sponsor: Address,
    ) {
        if env.storage().instance().has(&DataKey::Initialized) {
            panic!("already initialized");
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Issuer, &issuer);
        env.storage().instance().set(&DataKey::Dealer, &dealer);
        env.storage()
            .instance()
            .set(&DataKey::Custodian, &custodian);
        env.storage().instance().set(&DataKey::Sponsor, &sponsor);
        env.storage().instance().set(&DataKey::Initialized, &true);
    }

    /// Return whether the role configuration has been initialized.
    pub fn is_initialized(env: Env) -> bool {
        env.storage().instance().has(&DataKey::Initialized)
    }

    /// Retrieve the designated Admin address
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    /// Retrieve the designated Issuer address
    pub fn get_issuer(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Issuer).unwrap()
    }

    /// Retrieve the designated Dealer address
    pub fn get_dealer(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Dealer).unwrap()
    }

    /// Retrieve the designated Custodian address
    pub fn get_custodian(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Custodian).unwrap()
    }

    /// Retrieve the designated Sponsor address
    pub fn get_sponsor(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Sponsor).unwrap()
    }

    /// Configure the deployed ZATBILL Stellar Asset Contract.
    pub fn set_zatbill_token(env: Env, admin: Address, token: Address) {
        admin.require_auth();
        let configured_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if admin != configured_admin {
            panic!("unauthorized");
        }
        if env.storage().instance().has(&DataKey::ZatbillToken) {
            let existing: Address = env
                .storage()
                .instance()
                .get(&DataKey::ZatbillToken)
                .unwrap();
            if existing != token {
                panic!("ZATBILL token is already configured");
            }
            return;
        }
        env.storage().instance().set(&DataKey::ZatbillToken, &token);
    }

    /// Release ZATBILL held by this pot to a member under custodian approval.
    pub fn release_zatbill(env: Env, custodian: Address, to: Address, amount: i128) {
        custodian.require_auth();
        let configured_custodian: Address =
            env.storage().instance().get(&DataKey::Custodian).unwrap();
        if custodian != configured_custodian {
            panic!("unauthorized");
        }
        if amount <= 0 {
            panic!("amount must be positive");
        }
        let token: Address = env
            .storage()
            .instance()
            .get(&DataKey::ZatbillToken)
            .unwrap();
        let client = soroban_sdk::token::TokenClient::new(&env, &token);
        client.transfer(&env.current_contract_address(), &to, &amount);
    }

    /// Status check function
    pub fn version(env: Env) -> String {
        String::from_str(&env, "0.1.0-stokvel-pot")
    }
}

#[cfg(test)]
mod test;
