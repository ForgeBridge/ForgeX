use crate::curve::CurveParams;

const SCALE: i128 = 10_000_000;

/// Panics on overflow so that a curve computation that exceeds the i128 range
/// fails the transaction closed instead of silently wrapping. The curve does
/// not have a structured error enum of its own, so the message names the
/// failing computation.
fn need(v: Option<i128>, what: &str) -> i128 {
    v.unwrap_or_else(|| panic!("bonding curve {what} overflow"))
}

/// Current price per token unit at `tokens_sold`: `P0 * e^(k*S)`, in
/// SCALE-scaled fixed point. Panics on overflow.
pub fn calculate_price(params: &CurveParams, tokens_sold: i128) -> i128 {
    // P(S) = P₀ × e^(k × S)
    let exponent = need(params.steepness.checked_mul(tokens_sold), "price exponent") / SCALE;
    let exp_val = exp_approx(exponent);
    need(params.initial_price.checked_mul(exp_val), "price") / SCALE
}

/// Total cost to advance supply from `s1` to `s2`:
/// `(P0/k) * (e^(k*s2) - e^(k*s1))`. Returns zero when `s1 == s2`. Panics on
/// overflow.
pub fn calculate_buy_cost(params: &CurveParams, s1: i128, s2: i128) -> i128 {
    // Cost(S₁ → S₂) = (P₀ / k) × (e^(k × S₂) - e^(k × S₁))
    if s1 == s2 {
        return 0;
    }
    let exp_s1 = exp_approx(need(params.steepness.checked_mul(s1), "cost exponent") / SCALE);
    let exp_s2 = exp_approx(need(params.steepness.checked_mul(s2), "cost exponent") / SCALE);
    let diff = need(exp_s2.checked_sub(exp_s1), "cost diff");
    let ratio = need(
        params.initial_price.checked_div(params.steepness),
        "cost ratio",
    );
    need(ratio.checked_mul(diff), "cost") / SCALE
}

/// Payout for selling supply back from `s1` to `s2`; the reverse of a buy
/// over the same range. Panics on overflow.
pub fn calculate_sell_payout(params: &CurveParams, s1: i128, s2: i128) -> i128 {
    calculate_buy_cost(params, s2, s1)
}

fn exp_approx(x: i128) -> i128 {
    if x == 0 {
        return SCALE;
    }
    // Taylor series: e^x = 1 + x + x²/2! + x³/3! + ...
    // Using 15 terms for precision
    let mut result = SCALE;
    let mut term = SCALE;
    for i in 1..=15 {
        term = need(term.checked_mul(x), "exp term") / (SCALE * i as i128);
        result = need(result.checked_add(term), "exp");
        if term == 0 {
            break;
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_exp_approx_zero() {
        assert_eq!(exp_approx(0), SCALE);
    }

    #[test]
    fn test_calculate_price_zero_sold() {
        let params = CurveParams {
            initial_price: 100,
            steepness: 1,
            reserve_target: 5_000_000_000_000,
        };
        let price = calculate_price(&params, 0);
        assert_eq!(price, 100);
    }

    #[test]
    fn test_buy_sell_symmetry() {
        let params = CurveParams {
            initial_price: 100,
            steepness: 1,
            reserve_target: 5_000_000_000_000,
        };
        let cost = calculate_buy_cost(&params, 0, 1000);
        let payout = calculate_sell_payout(&params, 1000, 0);
        assert_eq!(cost, payout);
    }
}
