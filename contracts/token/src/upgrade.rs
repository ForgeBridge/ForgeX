use soroban_sdk::{contracttype, Address, BytesN, Env, Symbol};

use crate::metadata::TokenMetadata;

const VERSION_SYMBOL: &str = "token_version";

/// Version identifiers reported by [`TokenContract::version`].
///
/// `interface` tracks the public contract interface (incremented whenever a
/// function signature changes); `implementation` tracks a specific
/// deployment's implementation. Storage and upgrade logic live here so the
/// version numbers are kept in one place.
#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct InterfaceVersion {
    /// Number of the public contract interface. Incremented whenever a
    /// function signature changes in a way that breaks compatibility.
    pub interface: u32,
    /// Number of a specific deployment's implementation, incremented on every
    /// upgrade.
    pub implementation: u32,
}

/// The version of the interface and current implementation of the token.
pub const TOKEN_VERSION: InterfaceVersion = InterfaceVersion {
    interface: 1,
    implementation: 3,
};

impl InterfaceVersion {
    /// Writes the current version the first time the contract is initialized.
    pub fn initialize(env: &Env) {
        let key = Symbol::new(env, VERSION_SYMBOL);
        if env.storage().instance().has(&key) {
            return;
        }
        env.storage().instance().set(&key, &TOKEN_VERSION);
    }

    /// Reads the stored version, defaulting to the current implementation for
    /// deployments created before version tracking was introduced.
    pub fn read(env: &Env) -> InterfaceVersion {
        env.storage()
            .instance()
            .get(&Symbol::new(env, VERSION_SYMBOL))
            .unwrap_or(TOKEN_VERSION)
    }
}

/// Upgrade the contract implementation, admin-gated.
///
/// The new wasm hash is written by the host into the contract's own storage,
/// so subsequent invocations execute against the new implementation. Upgrades
/// are irreversible at the contract level, so the admin authorization is
/// required: only the current admin may move the contract to a new
/// implementation.
pub fn upgrade(env: &Env, new_wasm_hash: BytesN<32>) {
    let admin: Address = TokenMetadata::admin(env);
    admin.require_auth();
    env.deployer()
        .update_current_contract_wasm(new_wasm_hash.clone());
    // Bump the implementation version so that `version`/`upgrade` consumers
    // can detect the change on-chain.
    let current = InterfaceVersion::read(env);
    let next = InterfaceVersion {
        interface: current.interface,
        implementation: current.implementation + 1,
    };
    env.storage()
        .instance()
        .set(&Symbol::new(env, VERSION_SYMBOL), &next);
    env.events()
        .publish((Symbol::new(env, "upgrade"), admin, new_wasm_hash), ());
}
