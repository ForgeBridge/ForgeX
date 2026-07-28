use crate::curve::CurveParams;

const SCALE: i128 = 10_000_000;

pub fn calculate_price(params: &CurveParams, tokens_sold: i128) -> i128 {
    // P(S) = P₀ × e^(k × S)
    let exponent = params.steepness * tokens_sold / SCALE;
    let exp_val = exp_approx(exponent);
    params.initial_price * exp_val / SCALE
}

pub fn calculate_buy_cost(params: &CurveParams, s1: i128, s2: i128) -> i128 {
    // Cost(S₁ → S₂) = (P₀ / k) × (e^(k × S₂) - e^(k × S₁))
    if s1 == s2 {
        return 0;
    }
    let exp_s1 = exp_approx(params.steepness * s1 / SCALE);
    let exp_s2 = exp_approx(params.steepness * s2 / SCALE);
    let diff = exp_s2 - exp_s1;
    (params.initial_price / params.steepness) * diff / SCALE
}

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
        term = term * x / (SCALE * i as i128);
        result += term;
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
