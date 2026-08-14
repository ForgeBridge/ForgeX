#![cfg_attr(not(test), no_std)]
#![allow(deprecated)]

mod error;
mod factory;

#[cfg(test)]
mod test;

pub use error::ContractError;
pub use factory::{CreateTokenParams, CurveParams, FactoryContract, TokenInfo};
