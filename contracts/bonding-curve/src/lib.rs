#![cfg_attr(not(test), no_std)]
#![allow(deprecated)]

mod curve;
mod error;
mod math;
#[allow(dead_code)]
mod pool;

#[cfg(test)]
mod test;

pub use curve::BondingCurveContract;
pub use error::CurveError;
