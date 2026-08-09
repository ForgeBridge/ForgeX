#![allow(deprecated)]

mod error;
mod metadata;
mod token;

#[cfg(test)]
mod test;

pub use error::TokenError;
pub use metadata::TokenMetadata;
pub use token::TokenContract;
