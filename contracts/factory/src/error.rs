use soroban_sdk::contracterror;

/// Errors returned by the ForgeX token factory's fallible operations.
///
/// Factory entry points return `Result<T, ContractError>` instead of panicking
/// so that callers can recover from invalid input and invalid state instead of
/// having the whole transaction revert. Error codes are stable contract-level
/// values (1-9) that clients can match on.
#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    /// `initialize` was invoked on an already-initialized factory.
    AlreadyInitialized = 1,
    /// The caller was not the factory admin for an admin-only operation.
    Unauthorized = 2,
    /// The token metadata (name, symbol, decimals, max supply, image URI, or
    /// description) violated the factory's validation rules.
    InvalidMetadata = 3,
    /// The bonding curve parameters were invalid (non-positive price or
    /// steepness, or a negative reserve target).
    InvalidCurveParams = 4,
    /// A token with the same contract address, name, or symbol is already
    /// registered.
    TokenExists = 5,
    /// No token with the requested address, name, or symbol is registered.
    TokenNotFound = 6,
    /// The supplied token contract address does not exist in the ledger.
    InvalidTokenAddress = 7,
    /// The supplied bonding curve contract address does not exist in the
    /// ledger.
    InvalidCurveAddress = 8,
    /// The admin address supplied to `set_admin` does not exist in the ledger.
    InvalidAdminAddress = 9,
}
