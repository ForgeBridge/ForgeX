#![allow(deprecated)]

mod error;
mod factory;

#[cfg(test)]
mod test;

pub use error::ContractError;
pub use factory::{CreateTokenParams, CurveParams, FactoryContract, TokenInfo};
