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

    /// Status check function
    pub fn version(env: Env) -> String {
        String::from_str(&env, "0.1.0-stokvel-pot")
    }
}

#[cfg(test)]
mod test;
