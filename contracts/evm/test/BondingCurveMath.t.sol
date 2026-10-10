// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {BondingCurveMath, CurveOverflow} from "../src/libraries/BondingCurveMath.sol";
import {CurveOverflow} from "../src/libraries/BondingCurveMath.sol";

/// @notice Thin harness so the library can be exercised directly.
contract BondingCurveMathHarness {
    function expApprox(int256 x) external pure returns (int256) {
        return BondingCurveMath.expApprox(x);
    }

    function price(int256 initialPrice, int256 steepness, int256 tokensSold) external pure returns (int256) {
        return BondingCurveMath.price(
            BondingCurveMath.Params(initialPrice, steepness, 5_000_000_000_000), tokensSold
        );
    }

    function buyCost(int256 initialPrice, int256 steepness, int256 s1, int256 s2) external pure returns (int256) {
        return BondingCurveMath.buyCost(
            BondingCurveMath.Params(initialPrice, steepness, 5_000_000_000_000), s1, s2
        );
    }

    function sellPayout(int256 initialPrice, int256 steepness, int256 s1, int256 s2) external pure returns (int256) {
        return BondingCurveMath.sellPayout(
            BondingCurveMath.Params(initialPrice, steepness, 5_000_000_000_000), s1, s2
        );
    }
}

/// @title BondingCurveMathTest
/// @notice Parity tests for the curve math. Every expected value below was produced by the
///         Rust implementation in `contracts/stellar/bonding-curve/src/math.rs` and copied
///         verbatim; they are the shared contract between the two chains and must be
///         updated together. See `docs/BONDING_CURVE.md`.
contract BondingCurveMathTest is Test {
    BondingCurveMathHarness internal harness;

    function setUp() public {
        harness = new BondingCurveMathHarness();
    }

    // ------------------------------------------------------------- exp_approx

    function test_expApprox_zero_is_scale() public view {
        assertEq(harness.expApprox(0), 1e7, "exp(0) must be SCALE");
    }

    function test_expApprox_small_inputs_below_half_ulp_return_scale() public view {
        // The Rust implementation treats anything below SCALE / 1e7 as precision loss.
        assertEq(harness.expApprox(1), 10_000_001);
    }

    function test_expApprox_matches_rust_vectors() public view {
        assertEq(harness.expApprox(1), 10_000_001);
        assertEq(harness.expApprox(10), 10_000_010);
        assertEq(harness.expApprox(100), 10_000_100);
        assertEq(harness.expApprox(10_000), 10_010_005);
        assertEq(harness.expApprox(1_000_000), 11_051_707);
        assertEq(harness.expApprox(100_000_000), 219_914_820_144);
    }

    function test_expApprox_extremes_converge_like_rust() public view {
        // Far outside the converged range the Rust series breaks on term overflow and
        // returns the partial sum; the Solidity loop must bail out identically.
        assertEq(harness.expApprox(1_000_000_000_000_000_000), 50_000_000_001_000_000_000_010_000_000);
        assertEq(harness.expApprox(int256(170141183460469231731687303715884105727)), 10_000_000);
    }

    // ------------------------------------------------------------------ price

    function test_price_at_zero_supply_equals_initial_price() public view {
        assertEq(harness.price(10_000_000, 100, 0), 10_000_000);
    }

    function test_price_matches_rust_vectors_curve_a() public view {
        assertEq(harness.price(10_000_000, 100, 0), 10_000_000);
        assertEq(harness.price(10_000_000, 100, 1), 10_000_100);
        assertEq(harness.price(10_000_000, 100, 10), 10_001_000);
        assertEq(harness.price(10_000_000, 100, 100), 10_010_005);
        assertEq(harness.price(10_000_000, 100, 1_000), 10_100_501);
        assertEq(harness.price(10_000_000, 100, 12_345), 11_313_932);
        assertEq(harness.price(10_000_000, 100, 1_000_000), 219_914_820_144);
    }

    function test_price_matches_rust_vectors_curve_b() public view {
        // initial_price = 100, steepness = 1: the ForgeX default curve, where small trades
        // are entirely lost to truncation and only large ones move the quote.
        assertEq(harness.price(100, 1, 0), 100);
        assertEq(harness.price(100, 1, 1_000), 100);
        assertEq(harness.price(100, 1, 1_000_000), 110);
        assertEq(harness.price(100, 1, 500_000_000), 640_408_201_806_321_082);
    }

    function test_price_matches_rust_vectors_curve_c() public view {
        assertEq(harness.price(5_000_000, 3, 0), 5_000_000);
        assertEq(harness.price(5_000_000, 3, 1), 5_000_001);
        assertEq(harness.price(5_000_000, 3, 10), 5_000_015);
        assertEq(harness.price(5_000_000, 3, 100), 5_000_150);
        assertEq(harness.price(5_000_000, 3, 1_000), 5_001_500);
        assertEq(harness.price(5_000_000, 3, 12_345), 5_018_551);
        assertEq(harness.price(5_000_000, 3, 1_000_000), 6_749_293);
    }

    // -------------------------------------------------------------- buy/sell

    function test_buy_cost_and_sell_payout_are_exact_mirrors() public view {
        int256 cost = harness.buyCost(10_000_000, 100, 0, 1_000);
        assertEq(cost, 1_005);
        assertEq(harness.sellPayout(10_000_000, 100, 1_000, 0), 1_005);
        assertEq(harness.buyCost(10_000_000, 100, 1_000, 0), -1_005);
    }

    function test_buy_cost_matches_rust_vectors() public view {
        assertEq(harness.buyCost(10_000_000, 100, 0, 0), 0, "a zero-width window costs nothing");
        assertEq(harness.buyCost(10_000_000, 100, 0, 1), 1);
        assertEq(harness.buyCost(10_000_000, 100, 0, 1_000), 1_005);
        assertEq(harness.buyCost(10_000_000, 100, 500, 1_500), 1_010);
        assertEq(harness.buyCost(10_000_000, 100, 0, 1_000_000), 2_199_048_201);
        assertEq(harness.buyCost(10_000_000, 100, 999, 1), -1_003, "selling costs a negative amount");
        assertEq(harness.buyCost(10_000_000, 100, 0, 900_719_925_474), 12_179_184_367_569_655_070_987_906);
    }

    function test_buy_cost_linear_branch_when_steepness_is_zero() public view {
        // steepness == 0 degenerates to a linear price: cost = P0 * amount / SCALE.
        assertEq(harness.buyCost(10_000_000, 0, 0, 1_000), 1_000);
        assertEq(harness.buyCost(10_000_000, 0, 500, 1_500), 1_000);
    }

    function test_buy_cost_rust_vectors_second_curve() public view {
        assertEq(harness.buyCost(100, 1, 0, 1_000), 0);
        assertEq(harness.buyCost(100, 1, 0, 1_000_000), 10);
        assertEq(harness.buyCost(5_000_000, 3, 0, 1_000), 500);
        assertEq(harness.buyCost(5_000_000, 3, 0, 1_000_000), 583_097);
        assertEq(harness.buyCost(5_000_000, 3, 999, 1), -499);
    }

    function test_reverts_when_price_overflows_i128_range() public {
        // P0 * SCALE leaves the Soroban i128 range, so Rust's `need()` panics on the price
        // computation and the curve must revert rather than quote a different number.
        vm.expectRevert(CurveOverflow.selector);
        harness.price(1e32, 1, 0);
    }

    function test_reverts_when_curve_params_cannot_be_quoted() public {
        // steepness * tokens_sold itself leaves the i128 range, which Rust detects through
        // `checked_mul` and the curve must surface as a revert rather than a wrapped value.
        vm.expectRevert(CurveOverflow.selector);
        harness.buyCost(10_000_000, 100, 0, int256(type(int128).max));
    }
}
