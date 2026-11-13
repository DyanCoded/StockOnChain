#![no_std]
#![allow(deprecated)]
#![allow(clippy::too_many_arguments)]
#![allow(clippy::needless_borrows_for_generic_args)]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol,
};

/// Explicit lifecycle states for the Stokvel Pot.
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum PotState {
    Open = 0,
    Invested = 1,
    Matured = 2,
    Settled = 3,
}

/// Strict typed error enum for all revert conditions.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotAdmin = 3,
    NotDealer = 4,
    NotCustodian = 5,
    NotMember = 6,
    OverCap = 7,
    Paused = 8,
    WrongState = 9,
    ZeroAmount = 10,
    NotMatured = 11,
    AlreadyClaimed = 12,
    ZeroBalance = 13,
    InsufficientBacking = 14,
    InvalidDiscount = 15,
    AlreadyMember = 16,
    Unauthorized = 17,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    // Role & Configuration keys
    Admin,
    Issuer,
    Dealer,
    Custodian,
    Sponsor,
    MzarToken,
    ZatbillToken,
    TermDuration,
    MaturityTimestamp,
    MemberCap,
    ContributionAmount,

    // Lifecycle State
    State,
    Paused,
    Initialized,

    // Financial totals
    TotalContributions,
    TotalShares,
    ZatbillHeld,
    SettlementTotal,

    // Per-member Persistent storage (No loops over member lists!)
    Member(Address),
    MemberContribution(Address),
    MemberShares(Address),
    Claimed(Address),
}

const DAY_IN_LEDGERS: u32 = 17280; // ~5 seconds per ledger on Stellar
const INSTANCE_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS; // 30 days
const INSTANCE_LIFETIME_THRESHOLD: u32 = 7 * DAY_IN_LEDGERS;

fn extend_instance_ttl(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
}

fn extend_persistent_ttl(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
}

#[contract]
pub struct StokvelPotContract;

#[contractimpl]
impl StokvelPotContract {
    /// Hello entrypoint for connectivity verification.
    pub fn hello(env: Env, to: String) -> soroban_sdk::Vec<String> {
        let mut result = soroban_sdk::Vec::new(&env);
        result.push_back(String::from_str(&env, "Hello"));
        result.push_back(to);
        result
    }

    /// Legacy initializer retaining multi-role permissions.
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
        env.storage()
            .instance()
            .set(&DataKey::State, &PotState::Open);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage()
            .instance()
            .set(&DataKey::TotalContributions, &0i128);
        env.storage().instance().set(&DataKey::TotalShares, &0i128);
        env.storage().instance().set(&DataKey::ZatbillHeld, &0i128);
        env.storage()
            .instance()
            .set(&DataKey::SettlementTotal, &0i128);
        env.storage().instance().set(&DataKey::Initialized, &true);
        extend_instance_ttl(&env);
    }

    /// Full Stokvel Pot initialization per Issue T-04.
    pub fn init(
        env: Env,
        admin: Address,
        dealer: Address,
        mzar_token: Address,
        zatbill_token: Address,
        term_duration: u64,
        maturity_timestamp: u64,
        member_cap: i128,
        contribution_amount: i128,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Dealer, &dealer);
        env.storage()
            .instance()
            .set(&DataKey::MzarToken, &mzar_token);
        env.storage()
            .instance()
            .set(&DataKey::ZatbillToken, &zatbill_token);
        env.storage()
            .instance()
            .set(&DataKey::TermDuration, &term_duration);
        env.storage()
            .instance()
            .set(&DataKey::MaturityTimestamp, &maturity_timestamp);
        env.storage()
            .instance()
            .set(&DataKey::MemberCap, &member_cap);
        env.storage()
            .instance()
            .set(&DataKey::ContributionAmount, &contribution_amount);

        env.storage()
            .instance()
            .set(&DataKey::State, &PotState::Open);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage()
            .instance()
            .set(&DataKey::TotalContributions, &0i128);
        env.storage().instance().set(&DataKey::TotalShares, &0i128);
        env.storage().instance().set(&DataKey::ZatbillHeld, &0i128);
        env.storage()
            .instance()
            .set(&DataKey::SettlementTotal, &0i128);
        env.storage().instance().set(&DataKey::Initialized, &true);

        extend_instance_ttl(&env);
        env.events().publish(
            (Symbol::new(&env, "state_change"),),
            (PotState::Open, maturity_timestamp),
        );
        Ok(())
    }

    /// Add a member to the pot's allowlist (Admin only).
    pub fn add_member(env: Env, admin: Address, member: Address) -> Result<(), Error> {
        admin.require_auth();
        let configured_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        if admin != configured_admin {
            return Err(Error::NotAdmin);
        }

        let member_key = DataKey::Member(member.clone());
        if env
            .storage()
            .persistent()
            .get::<DataKey, bool>(&member_key)
            .unwrap_or(false)
        {
            return Err(Error::AlreadyMember);
        }

        env.storage().persistent().set(&member_key, &true);
        env.storage()
            .persistent()
            .set(&DataKey::MemberContribution(member.clone()), &0i128);
        env.storage()
            .persistent()
            .set(&DataKey::MemberShares(member.clone()), &0i128);
        env.storage()
            .persistent()
            .set(&DataKey::Claimed(member.clone()), &false);

        extend_persistent_ttl(&env, &member_key);
        extend_instance_ttl(&env);

        env.events()
            .publish((Symbol::new(&env, "member_added"),), member);
        Ok(())
    }

    /// Pull mZAR tokens from a member and credit pro-rata shares.
    pub fn contribute(env: Env, member: Address, amount: i128) -> Result<i128, Error> {
        if Self::is_paused(env.clone()) {
            return Err(Error::Paused);
        }
        if Self::get_state(env.clone()) != PotState::Open {
            return Err(Error::WrongState);
        }
        if amount <= 0 {
            return Err(Error::ZeroAmount);
        }
        if !Self::is_member(env.clone(), member.clone()) {
            return Err(Error::NotMember);
        }

        member.require_auth();

        let current_contrib = Self::get_member_contribution(env.clone(), member.clone());
        let cap = Self::get_member_cap(env.clone());
        if current_contrib + amount > cap {
            return Err(Error::OverCap);
        }

        let mzar_token = Self::get_mzar_token(env.clone());
        let client = soroban_sdk::token::Client::new(&env, &mzar_token);
        client.transfer(&member, &env.current_contract_address(), &amount);

        let new_contrib = current_contrib + amount;
        let contrib_key = DataKey::MemberContribution(member.clone());
        env.storage().persistent().set(&contrib_key, &new_contrib);

        let current_shares = Self::get_member_shares(env.clone(), member.clone());
        let new_shares = current_shares + amount;
        let shares_key = DataKey::MemberShares(member.clone());
        env.storage().persistent().set(&shares_key, &new_shares);

        let total_contrib = Self::get_total_contributions(env.clone());
        env.storage()
            .instance()
            .set(&DataKey::TotalContributions, &(total_contrib + amount));

        let total_shares = Self::get_total_shares(env.clone());
        env.storage()
            .instance()
            .set(&DataKey::TotalShares, &(total_shares + amount));

        extend_persistent_ttl(&env, &contrib_key);
        extend_persistent_ttl(&env, &shares_key);
        extend_instance_ttl(&env);

        env.events().publish(
            (Symbol::new(&env, "contributed"),),
            (member, amount, new_shares),
        );

        Ok(new_contrib)
    }

    /// Swap accumulated mZAR for discounted ZATBILL tokens with the dealer.
    /// Both admin and dealer authorize in a single transaction.
    /// Enforces backing verification: zatbill_amount received must >= total_mzar spent.
    pub fn invest(
        env: Env,
        admin: Address,
        dealer: Address,
        zatbill_amount: i128,
    ) -> Result<(), Error> {
        if Self::is_paused(env.clone()) {
            return Err(Error::Paused);
        }
        if Self::get_state(env.clone()) != PotState::Open {
            return Err(Error::WrongState);
        }

        admin.require_auth();
        dealer.require_auth();

        let configured_admin = Self::get_admin(env.clone());
        if admin != configured_admin {
            return Err(Error::NotAdmin);
        }
        let configured_dealer = Self::get_dealer(env.clone());
        if dealer != configured_dealer {
            return Err(Error::NotDealer);
        }

        let total_mzar = Self::get_total_contributions(env.clone());
        if total_mzar <= 0 {
            return Err(Error::ZeroAmount);
        }

        // Backing verification: Face value of ZATBILL is R1.00.
        // Therefore, at least 1 ZATBILL per 1 mZAR must be held for full collateral backing.
        if zatbill_amount < total_mzar {
            return Err(Error::InsufficientBacking);
        }

        let mzar_token = Self::get_mzar_token(env.clone());
        let zatbill_token = Self::get_zatbill_token(env.clone());

        let mzar_client = soroban_sdk::token::Client::new(&env, &mzar_token);
        let zatbill_client = soroban_sdk::token::Client::new(&env, &zatbill_token);

        // Pot transfers accumulated mZAR to the dealer
        mzar_client.transfer(&env.current_contract_address(), &dealer, &total_mzar);
        // Dealer transfers discounted ZATBILL into the pot
        zatbill_client.transfer(&dealer, &env.current_contract_address(), &zatbill_amount);

        env.storage()
            .instance()
            .set(&DataKey::ZatbillHeld, &zatbill_amount);
        env.storage()
            .instance()
            .set(&DataKey::State, &PotState::Invested);

        extend_instance_ttl(&env);
        env.events().publish(
            (Symbol::new(&env, "state_change"),),
            (PotState::Open, PotState::Invested),
        );
        env.events().publish(
            (Symbol::new(&env, "invested"),),
            (total_mzar, zatbill_amount),
        );

        Ok(())
    }

    /// Transition state to Matured once maturity timestamp has been reached.
    pub fn mature(env: Env) -> Result<(), Error> {
        let current_state = Self::get_state(env.clone());
        if current_state != PotState::Invested {
            return Err(Error::WrongState);
        }
        let maturity = Self::get_maturity_timestamp(env.clone());
        if env.ledger().timestamp() < maturity {
            return Err(Error::NotMatured);
        }

        env.storage()
            .instance()
            .set(&DataKey::State, &PotState::Matured);
        extend_instance_ttl(&env);

        env.events().publish(
            (Symbol::new(&env, "state_change"),),
            (PotState::Invested, PotState::Matured),
        );
        Ok(())
    }

    /// Settle the pot: return ZATBILL tokens to dealer in exchange for face value in mZAR.
    /// Callable only after maturity. Dealer authorizes the mZAR payout.
    pub fn settle(env: Env, dealer: Address) -> Result<(), Error> {
        if Self::is_paused(env.clone()) {
            return Err(Error::Paused);
        }
        let maturity = Self::get_maturity_timestamp(env.clone());
        if env.ledger().timestamp() < maturity {
            return Err(Error::NotMatured);
        }

        let state = Self::get_state(env.clone());
        if state != PotState::Invested && state != PotState::Matured {
            return Err(Error::WrongState);
        }

        dealer.require_auth();
        let configured_dealer = Self::get_dealer(env.clone());
        if dealer != configured_dealer {
            return Err(Error::NotDealer);
        }

        let zatbill_held = Self::get_zatbill_held(env.clone());
        let mzar_token = Self::get_mzar_token(env.clone());
        let zatbill_token = Self::get_zatbill_token(env.clone());

        let mzar_client = soroban_sdk::token::Client::new(&env, &mzar_token);
        let zatbill_client = soroban_sdk::token::Client::new(&env, &zatbill_token);

        // Return ZATBILL to dealer
        zatbill_client.transfer(&env.current_contract_address(), &dealer, &zatbill_held);
        // Dealer provides face-value settlement in mZAR (1:1 with ZATBILL units)
        mzar_client.transfer(&dealer, &env.current_contract_address(), &zatbill_held);

        env.storage()
            .instance()
            .set(&DataKey::SettlementTotal, &zatbill_held);
        env.storage()
            .instance()
            .set(&DataKey::State, &PotState::Settled);

        extend_instance_ttl(&env);
        env.events().publish(
            (Symbol::new(&env, "state_change"),),
            (state, PotState::Settled),
        );
        env.events().publish(
            (Symbol::new(&env, "settled"),),
            (zatbill_held, zatbill_held),
        );

        Ok(())
    }

    /// Member claims their pro-rata share of the settled mZAR pot.
    /// Operates in O(1) on the caller with zero iteration.
    /// Integer division remainder remains in the pot, preventing contract insolvency.
    pub fn claim(env: Env, member: Address) -> Result<i128, Error> {
        let maturity = Self::get_maturity_timestamp(env.clone());
        if env.ledger().timestamp() < maturity {
            return Err(Error::NotMatured);
        }
        if Self::get_state(env.clone()) != PotState::Settled {
            return Err(Error::WrongState);
        }
        if !Self::is_member(env.clone(), member.clone()) {
            return Err(Error::NotMember);
        }
        if Self::has_claimed(env.clone(), member.clone()) {
            return Err(Error::AlreadyClaimed);
        }

        member.require_auth();

        let shares = Self::get_member_shares(env.clone(), member.clone());
        if shares <= 0 {
            return Err(Error::ZeroBalance);
        }

        let total_shares = Self::get_total_shares(env.clone());
        let settlement_total = Self::get_settlement_total(env.clone());

        // Rounding rule: Integer floor division. Residual fractions of cent remain in pot.
        let payout = (shares * settlement_total) / total_shares;

        let claimed_key = DataKey::Claimed(member.clone());
        env.storage().persistent().set(&claimed_key, &true);

        let mzar_token = Self::get_mzar_token(env.clone());
        let mzar_client = soroban_sdk::token::Client::new(&env, &mzar_token);
        mzar_client.transfer(&env.current_contract_address(), &member, &payout);

        extend_persistent_ttl(&env, &claimed_key);
        extend_instance_ttl(&env);

        env.events()
            .publish((Symbol::new(&env, "claimed"),), (member, shares, payout));

        Ok(payout)
    }

    /// Emergency pause mechanism (Admin only).
    pub fn pause(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();
        if admin != Self::get_admin(env.clone()) {
            return Err(Error::NotAdmin);
        }
        env.storage().instance().set(&DataKey::Paused, &true);
        extend_instance_ttl(&env);
        env.events().publish((symbol_short!("paused"),), admin);
        Ok(())
    }

    /// Resume operations (Admin only).
    pub fn unpause(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();
        if admin != Self::get_admin(env.clone()) {
            return Err(Error::NotAdmin);
        }
        env.storage().instance().set(&DataKey::Paused, &false);
        extend_instance_ttl(&env);
        env.events().publish((symbol_short!("unpaused"),), admin);
        Ok(())
    }

    /// Retrieve the current lifecycle state of the pot.
    /// If Invested and ledger timestamp >= maturity, reflects Matured state.
    pub fn get_state(env: Env) -> PotState {
        let explicit: PotState = env
            .storage()
            .instance()
            .get(&DataKey::State)
            .unwrap_or(PotState::Open);

        if explicit == PotState::Invested {
            if let Some(maturity) = env
                .storage()
                .instance()
                .get::<DataKey, u64>(&DataKey::MaturityTimestamp)
            {
                if env.ledger().timestamp() >= maturity {
                    return PotState::Matured;
                }
            }
        }
        explicit
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    pub fn is_initialized(env: Env) -> bool {
        env.storage().instance().has(&DataKey::Initialized)
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    pub fn get_dealer(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Dealer).unwrap()
    }

    pub fn get_issuer(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Issuer).unwrap()
    }

    pub fn get_custodian(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Custodian).unwrap()
    }

    pub fn get_sponsor(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Sponsor).unwrap()
    }

    pub fn get_mzar_token(env: Env) -> Address {
        env.storage().instance().get(&DataKey::MzarToken).unwrap()
    }

    pub fn get_zatbill_token(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::ZatbillToken)
            .unwrap()
    }

    pub fn get_term_duration(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::TermDuration)
            .unwrap_or(0)
    }

    pub fn get_maturity_timestamp(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::MaturityTimestamp)
            .unwrap_or(0)
    }

    pub fn get_member_cap(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::MemberCap)
            .unwrap_or(i128::MAX)
    }

    pub fn get_contribution_amount(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::ContributionAmount)
            .unwrap_or(0)
    }

    pub fn get_total_contributions(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalContributions)
            .unwrap_or(0)
    }

    pub fn get_total_shares(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalShares)
            .unwrap_or(0)
    }

    pub fn get_zatbill_held(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::ZatbillHeld)
            .unwrap_or(0)
    }

    pub fn get_settlement_total(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::SettlementTotal)
            .unwrap_or(0)
    }

    pub fn is_member(env: Env, member: Address) -> bool {
        env.storage()
            .persistent()
            .get::<DataKey, bool>(&DataKey::Member(member))
            .unwrap_or(false)
    }

    pub fn get_member_contribution(env: Env, member: Address) -> i128 {
        env.storage()
            .persistent()
            .get::<DataKey, i128>(&DataKey::MemberContribution(member))
            .unwrap_or(0)
    }

    pub fn get_member_shares(env: Env, member: Address) -> i128 {
        env.storage()
            .persistent()
            .get::<DataKey, i128>(&DataKey::MemberShares(member))
            .unwrap_or(0)
    }

    pub fn has_claimed(env: Env, member: Address) -> bool {
        env.storage()
            .persistent()
            .get::<DataKey, bool>(&DataKey::Claimed(member))
            .unwrap_or(false)
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
        let client = soroban_sdk::token::Client::new(&env, &token);
        client.transfer(&env.current_contract_address(), &to, &amount);
    }

    pub fn version(env: Env) -> String {
        String::from_str(&env, "0.2.0-stokvel-pot")
    }
}

#[cfg(test)]
mod test;
