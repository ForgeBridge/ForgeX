#![allow(deprecated)]

mod curve;

mod math;
#[allow(dead_code)]
mod pool;

#[cfg(test)]
mod test;

pub use curve::BondingCurveContract;
