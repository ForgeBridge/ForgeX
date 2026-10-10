// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.24;

/// @notice Raised where the Soroban implementation panics through `need()`.
error CurveOverflow();

/// @title BondingCurveMath
/// @notice Bit-for-bit Solidity port of `contracts/stellar/bonding-curve/src/math.rs`.
///
/// @dev The Soroban contracts price the curve with i128 fixed-point arithmetic and a
///      20-term Taylor approximation of `e^x`. Both languages truncate integer division
///      toward zero, so identical inputs produce identical outputs on both chains. Every
///      helper below is bounded to the i128 range on purpose: where Rust's `checked_mul`
///      breaks out of the series, this implementation must break at the same term, or the
///      two chains would quote different numbers once prices leave the comfortable range.
///      That is what keeps `docs/BONDING_CURVE.md` meaningful across deployments.
library BondingCurveMath {
    /// @notice Fixed-point scale factor, identical to `SCALE` in the Rust implementation.
    int256 internal constant SCALE = 10_000_000;

    /// @notice Number of Taylor series terms, identical to the Rust implementation.
    uint256 internal constant TERMS = 20;

    /// @dev Bounds of the Soroban `i128` type, which the Rust curve math operates in.
    int256 internal constant I128_MAX = type(int128).max;
    int256 internal constant I128_MIN = type(int128).min;

    struct Params {
        /// Price of the first token unit, in 1/SCALE precision.
        int256 initialPrice;
        /// Exponential growth steepness `k`, in 1/SCALE precision.
        int256 steepness;
        /// Target reserve the launcher intends the curve to hold. Informational.
        int256 reserveTarget;
    }

    /// @notice Current price per token unit at `tokensSold`: `P0 * e^(k*S)`.
    /// @dev Reverts on overflow, mirroring the Rust `need()` helper which panics.
    function price(Params memory p, int256 tokensSold) internal pure returns (int256) {
        int256 exponent = _checkedMul(p.steepness, tokensSold);
        int256 expValue = expApprox(exponent);
        return _checkedDiv(_checkedMul(p.initialPrice, expValue), SCALE);
    }

    /// @notice Total cost to advance supply from `s1` to `s2`.
    /// @dev `(P0/k) * (e^(k*s2) - e^(k*s1))`; zero when `s1 == s2`.
    function buyCost(Params memory p, int256 s1, int256 s2) internal pure returns (int256) {
        if (s1 == s2) {
            return 0;
        }
        if (p.steepness == 0) {
            int256 amount = _checkedSub(s2, s1);
            return _checkedDiv(_checkedMul(p.initialPrice, amount), SCALE);
        }
        int256 expS1 = expApprox(_checkedMul(p.steepness, s1));
        int256 expS2 = expApprox(_checkedMul(p.steepness, s2));
        int256 diff = _checkedSub(expS2, expS1);
        int256 numerator = _checkedMul(p.initialPrice, diff);
        int256 denominator = _checkedMul(p.steepness, SCALE);
        return _checkedDiv(numerator, denominator);
    }

    /// @notice Payout for selling supply back from `s1` to `s2`; the reverse of a buy.
    function sellPayout(Params memory p, int256 s1, int256 s2) internal pure returns (int256) {
        return buyCost(p, s2, s1);
    }

    /// @notice Market cap: `price * tokensSold`, in whole token units.
    function marketCap(int256 priceValue, int256 tokensSold) internal pure returns (int256) {
        return _checkedDiv(_checkedMul(priceValue, tokensSold), SCALE);
    }

    /// @notice Fee taken from `amount` at `feeBps`.
    function feeOf(int256 amount, int256 feeBps) internal pure returns (int256) {
        return _checkedDiv(_checkedMul(amount, feeBps), 10_000);
    }

    /// @notice Approximates `e^x` with a Taylor series of up to 20 terms.
    /// @dev The iteration stops early when a term or the partial sum would leave the i128
    ///      range, or when a term truncates to zero. This mirrors the Rust `break` branches
    ///      exactly, which do not revert but return the converged partial sum.
    function expApprox(int256 x) internal pure returns (int256) {
        if (x == 0) {
            return SCALE;
        }
        // Matches the Rust guard against precision loss on very small inputs.
        if (_abs(x) < SCALE / 10_000_000) {
            return SCALE;
        }

        int256 result = SCALE;
        int256 term = SCALE;

        for (uint256 i = 1; i <= TERMS; ++i) {
            (bool mulOk, int256 product) = _tryMul(term, x);
            if (!mulOk) {
                // The series has converged far enough; keep the partial sum.
                break;
            }
            (bool divOk, int256 nextTerm) = _tryDiv(product, SCALE * int256(i));
            if (!divOk) {
                break;
            }
            term = nextTerm;

            (bool addOk, int256 next) = _tryAdd(result, term);
            if (!addOk) {
                break;
            }
            result = next;

            if (term == 0) {
                break;
            }
        }

        return result;
    }

    // -------------------------------------------------- i128-bounded arithmetic

    function _abs(int256 x) private pure returns (int256) {
        if (x == type(int256).min) {
            return type(int256).max;
        }
        return x < 0 ? -x : x;
    }

    /// @dev Checked multiply. Reports failure instead of reverting when the product would
    ///      fall outside the Soroban i128 range.
    function _tryMul(int256 a, int256 b) private pure returns (bool ok, int256 product) {
        if (a == 0 || b == 0) {
            return (true, 0);
        }
        unchecked {
            if ((a == I128_MIN && b == -1) || (b == I128_MIN && a == -1)) {
                return (false, 0);
            }
            product = a * b;
            // `product / a != b` detects a wrap in the int256 multiplication itself.
            if (product / a != b) {
                return (false, 0);
            }
            if (product > I128_MAX || product < I128_MIN) {
                return (false, 0);
            }
            return (true, product);
        }
    }

    /// @dev Checked addition with the same i128 bound.
    function _tryAdd(int256 a, int256 b) private pure returns (bool ok, int256 sum) {
        unchecked {
            sum = a + b;
            if (b > 0 && sum < a) {
                return (false, 0);
            }
            if (b < 0 && sum > a) {
                return (false, 0);
            }
            if (sum > I128_MAX || sum < I128_MIN) {
                return (false, 0);
            }
            return (true, sum);
        }
    }

    /// @dev Checked division; the i128 bound on the operands keeps the quotient in range
    ///      apart from the single wrapping corner case.
    function _tryDiv(int256 a, int256 b) private pure returns (bool ok, int256 quotient) {
        if (b == 0) {
            return (false, 0);
        }
        if (a == I128_MIN && b == -1) {
            return (false, 0);
        }
        return (true, a / b);
    }

    function _checkedMul(int256 a, int256 b) private pure returns (int256) {
        (bool ok, int256 value) = _tryMul(a, b);
        if (!ok) revert CurveOverflow();
        return value;
    }

    function _checkedAdd(int256 a, int256 b) private pure returns (int256) {
        (bool ok, int256 value) = _tryAdd(a, b);
        if (!ok) revert CurveOverflow();
        return value;
    }

    function _checkedSub(int256 a, int256 b) private pure returns (int256) {
        return _checkedAdd(a, -b);
    }

    function _checkedDiv(int256 a, int256 b) private pure returns (int256) {
        (bool ok, int256 value) = _tryDiv(a, b);
        if (!ok) revert CurveOverflow();
        return value;
    }
}
