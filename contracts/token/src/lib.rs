#![cfg_attr(not(test), no_std)]
#![allow(deprecated)]

mod error;
mod metadata;
mod token;
mod upgrade;

#[cfg(test)]
mod test;

pub use error::TokenError;
pub use metadata::TokenMetadata;
pub use token::TokenContract;
pub use upgrade::InterfaceVersion;
