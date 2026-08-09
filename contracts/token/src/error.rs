use soroban_sdk::{contracterror, panic_with_error, Env};

#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
#[repr(u32)]
pub enum TokenError {
    InternalError = 1,
    AlreadyInitializedError = 2,
    UnauthorizedError = 3,
    NegativeAmountError = 4,
    AllowanceError = 5,
    BalanceError = 6,
    DecimalsError = 7,
    OverflowError = 8,
    BecomingInsufficientAllowanceError = 9,
    DurationError = 10,
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
