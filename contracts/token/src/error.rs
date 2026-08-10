use soroban_sdk::{contracterror, panic_with_error, Env};

/// Errors returned by the ForgeX token's fallible operations.
///
/// Entry points return `Result<T, TokenError>` rather than panicking so that
/// callers can recover from invalid input and invalid state instead of having
/// the whole transaction revert. Error codes are stable contract-level values
/// (1-14) that clients can match on.
#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
#[repr(u32)]
pub enum TokenError {
    /// An unexpected internal failure (e.g. an arithmetic overflow).
    InternalError = 1,
    /// A constructor/initializer was invoked on an already-initialized
    /// contract.
    AlreadyInitializedError = 2,
    /// The calling address was not authorized for the operation, or a party
    /// involved in the operation has been revoked.
    UnauthorizedError = 3,
    /// The supplied amount was negative (or, for mint/burn, non-positive).
    NegativeAmountError = 4,
    /// An allowance was insufficient to cover the requested spend.
    AllowanceError = 5,
    /// A balance was insufficient to cover the requested transfer.
    BalanceError = 6,
    /// The configured decimals were outside the valid 0-255 range.
    DecimalsError = 7,
    /// An arithmetic result overflowed the i128 range.
    OverflowError = 8,
    /// Deprecated legacy variant; refers to an allowance decrease that would
    /// become insufficient and is not produced by the current implementation.
    BecomingInsufficientAllowanceError = 9,
    /// Deprecated legacy variant; refers to an allowance expiration and is not
    /// produced by the current implementation, which stores permissions
    /// without expiring them.
    DurationError = 10,
    /// Token metadata (name or symbol) violated the 1-32 byte format rule.
    InvalidMetadataError = 11,
    /// The token is paused and does not permit value-moving operations.
    ContractPausedError = 12,
    /// The configured transfer hook failed or attempted to re-enter the token.
    HooksError = 13,
    /// A mint would push the total supply above the configured `max_supply`.
    MaxSupplyError = 14,
}

impl TokenError {
    /// Panics with the given contract error, terminating the transaction in a
    /// fail-closed manner. Used by functions that keep plain return types so
    /// that invalid input produces a structured error rather than a generic
    /// panic.
    pub(crate) fn panic(&self, env: &Env) -> ! {
        panic_with_error!(env, *self)
    }
}
