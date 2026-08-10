use soroban_sdk::contracterror;

/// Errors returned by the bonding curve contract's fallible operations.
///
/// Curve entry points return `Result<T, CurveError>` instead of panicking
/// so that callers can recover from invalid input and invalid state instead of
/// having the whole transaction revert. Error codes are stable contract-level
/// values that clients can match on.
#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
#[repr(u32)]
pub enum CurveError {
    /// An unexpected internal failure (e.g. an arithmetic overflow).
    InternalError = 1,
    /// The curve contract was not initialized before use.
    NotInitialized = 2,
    /// The caller was not authorized for the operation.
    Unauthorized = 3,
    /// The buy amount was non-positive or invalid.
    InvalidBuyAmount = 4,
    /// The sell amount was non-positive or invalid.
    InvalidSellAmount = 5,
    /// The supplied cost exceeds the slippage limit.
    SlippageExceeded = 6,
    /// The supplied payout is below the slippage limit.
    InsufficientPayout = 7,
    /// The deadline has expired.
    DeadlineExpired = 8,
    /// The fee rate is out of valid bounds (0-10000).
    InvalidFeeRate = 9,
    /// The buy limits are invalid (min > max).
    InvalidBuyLimits = 10,
    /// The sell limits are invalid (min > max).
    InvalidSellLimits = 11,
    /// The cap is invalid (less than current tokens sold).
    InvalidCap = 12,
    /// The buy amount is below the minimum limit.
    BuyBelowMinimum = 13,
    /// The buy amount exceeds the maximum limit.
    BuyExceedsMaximum = 14,
    /// The sell amount is below the minimum limit.
    SellBelowMinimum = 15,
    /// The sell amount exceeds the maximum limit.
    SellExceedsMaximum = 16,
    /// The buy would exceed the curve cap.
    CapExceeded = 17,
    /// There are no fees to withdraw.
    NoFeesToWithdraw = 18,
    /// A reentrancy guard was triggered.
    ReentrancyGuard = 19,
}
