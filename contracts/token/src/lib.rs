#![allow(deprecated)]

mod metadata;
mod token;

#[cfg(test)]
mod test;

pub use metadata::TokenMetadata;
pub use token::TokenContract;
