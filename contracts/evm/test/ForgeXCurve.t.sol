// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {ForgeXCurve} from "../src/ForgeXCurve.sol";
import {ForgeXProxy} from "../src/ForgeXProxy.sol";
import {IForgeXTypes} from "../src/interfaces/IForgeXTypes.sol";import {ForgeXToken} from "../src/ForgeXToken.sol";
import {MockQuote, ReentrantQuote} from "./mocks/Mocks.sol";

/// @title ForgeXCurveTest
/// @notice Ports the Soroban curve suite (`contracts/stellar/bonding-curve/src/test.rs`) to
///         Foundry. Test names carry over so a failure on one chain maps to the other.
contract ForgeXCurveTest is Base {
    ForgeXToken internal token;
    ForgeXCurve internal curve;
    MockQuote internal usdc;

    function setUp() public override {
        super.setUp();
        (token, curve, usdc) = forgePair();
    }

    // ---------------------------------------------------------------- initialize

    function test_initialize() public view {
        assertEq(curve.get_price(), INITIAL_PRICE);
        assertEq(curve.token(), address(token));
        assertEq(curve.admin(), admin);
        assertEq(curve.quote_token(), address(usdc));
        assertEq(curve.get_fee_rate(), 0);
        assertFalse(curve.is_graduated());
    }

    function test_get_reserve_initial() public view {
        assertEq(curve.get_reserve(), 0);
    }

    function test_get_tokens_sold_initial() public view {
        assertEq(curve.get_tokens_sold(), 0);
    }

    function test_get_curve_info() public view {
        IForgeXTypes.CurveInfo memory info = curve.get_curve_info();
        assertEq(info.token_id, address(token));
        assertEq(info.initial_price, INITIAL_PRICE);
        assertEq(info.steepness, STEEPNESS);
        assertEq(info.reserve, 0);
        assertEq(info.tokens_sold, 0);
        assertEq(info.price, INITIAL_PRICE);
        assertEq(info.admin, admin);
        assertEq(info.fee_rate, 0);
        assertEq(info.cap, type(int128).max, "no cap until the admin sets one");
        assertFalse(info.graduated);
        assertEq(info.admin_fees, 0);
    }

    function test_initialize_rejects_bad_curve_params() public {
        // initial_price must be positive, like the factory's InvalidCurveParams check.
        ForgeXCurve curve2 = deployCurveProxy("");
        curve2.initialize(address(this), address(token), 1, 1, 0, admin, address(0));
        ForgeXCurve bad = deployCurveProxy("");
        vm.expectRevert(ForgeXCurve.InvalidCurveParams.selector);
        bad.initialize(address(this), address(token), 0, 1, 0, admin, address(0));
    }

    function test_initialize_cannot_run_twice() public {
        vm.expectRevert(ForgeXCurve.AlreadyInitializedError.selector);
        curve.initialize(address(this), address(token), 1, 1, 0, admin, address(0));
    }

    function test_initialize_only_from_the_factory() public {
        ForgeXCurve curve2 = deployCurveProxy("");
        vm.startPrank(stranger);
        vm.expectRevert(ForgeXCurve.NotFactory.selector);
        curve2.initialize(address(this), address(token), 1, 1, 0, admin, address(0));
        vm.stopPrank();
    }

    // ----------------------------------------------------------------------- buy

    function test_buy_rejects_non_positive_amounts() public {
        vm.expectRevert(ForgeXCurve.InvalidBuyAmount.selector);
        vm.prank(trader);
        curve.buy(0, type(int256).max, FAR_DEADLINE);

        assertEq(curve.get_tokens_sold(), 0);
        assertEq(curve.get_reserve(), 0);
    }

    function test_buy_slippage_protection() public {
        vm.prank(trader);
        vm.expectRevert(ForgeXCurve.SlippageExceeded.selector);
        curve.buy(1000, -1, FAR_DEADLINE);

        assertEq(curve.get_tokens_sold(), 0);
        assertEq(curve.get_reserve(), 0);

        vm.prank(trader);
        curve.buy(1000, type(int256).max, FAR_DEADLINE);
        assertEq(curve.get_tokens_sold(), 1000);
    }

    function test_buy_keeps_state_consistent() public {
        vm.prank(trader);
        int256 owed = curve.buy(1000, type(int256).max, FAR_DEADLINE);
        assertEq(curve.get_tokens_sold(), 1000);
        assertEq(curve.get_reserve(), owed, "the reserve grows by the cost, not the fee");
        IForgeXTypes.CurveInfo memory info = curve.get_curve_info();
        assertEq(info.tokens_sold, 1000);
        assertEq(info.reserve, owed);
        assertEq(info.market_cap, (info.price * info.tokens_sold) / 10_000_000);
    }

    function test_buy_mints_tokens_to_the_buyer() public {
        vm.prank(trader);
        curve.buy(1000, type(int256).max, FAR_DEADLINE);
        assertEq(token.balanceOf(trader), 1000, "the curve is the settling party, not just an accountant");
        assertEq(token.totalSupply(), 1000);
    }

    function test_buy_with_erc20_quote_moves_funds() public {
        (ForgeXToken token2, ForgeXCurve curve2, MockQuote quote2) = forgePair();
        uint256 before = quote2.balanceOf(trader);
        vm.prank(trader);
        int256 owed = curve2.buy(1000, type(int256).max, FAR_DEADLINE);

        assertEq(quote2.balanceOf(trader), before - uint256(owed));
        assertEq(quote2.balanceOf(address(curve2)), uint256(owed));
        assertEq(curve2.get_reserve(), owed, "with no fee the reserve receives the whole payment");
    }

    function test_buy_rejects_wrong_native_payment() public {
        vm.prank(trader);
        vm.expectRevert(ForgeXCurve.IncorrectPayment.selector);
        curve.buy{value: 1}(1000, type(int256).max, FAR_DEADLINE);
    }

    function test_buy_rejects_eth_with_erc20_quote() public {
        (ForgeXToken token2, ForgeXCurve curve2, MockQuote usdc) = forgePair();
        vm.prank(trader);
        vm.expectRevert(ForgeXCurve.IncorrectPayment.selector);
        curve2.buy{value: 1}(1000, type(int256).max, FAR_DEADLINE);
    }

    // ---------------------------------------------------------------------- sell

    function test_sell_rejects_invalid_amounts() public {
        vm.startPrank(trader);
        vm.expectRevert(ForgeXCurve.InvalidSellAmount.selector);
        curve.sell(0, 0, FAR_DEADLINE);
        vm.expectRevert(ForgeXCurve.InvalidSellAmount.selector);
        curve.sell(100, 0, FAR_DEADLINE);
        vm.stopPrank();

        assertEq(curve.get_tokens_sold(), 0);
        assertEq(curve.get_reserve(), 0);
    }

    function test_sell_slippage_protection() public {
        vm.prank(trader);
        curve.buy(1000, type(int256).max, FAR_DEADLINE);

        vm.prank(trader);
        vm.expectRevert(ForgeXCurve.InsufficientPayout.selector);
        curve.sell(500, type(int256).max, FAR_DEADLINE);

        assertEq(curve.get_tokens_sold(), 1000);

        vm.prank(trader);
        curve.sell(500, 0, FAR_DEADLINE);
        assertEq(curve.get_tokens_sold(), 500);
    }

    function test_sell_burns_tokens_and_pays_out() public {
        vm.prank(trader);
        int256 owed = curve.buy(1000, type(int256).max, FAR_DEADLINE);
        uint256 before = usdc.balanceOf(trader);

        vm.prank(trader);
        int256 net = curve.sell(500, 0, FAR_DEADLINE);
        assertEq(token.balanceOf(trader), 500);
        assertEq(token.totalSupply(), 500);
        assertEq(usdc.balanceOf(trader), before + uint256(net), "the curve pays out of its own reserve");
        assertEq(usdc.balanceOf(trader), TRADER_FUNDING - uint256(owed) + uint256(net));
    }

    function test_sell_to_erc20_quote_moves_funds() public {
        (ForgeXToken token2, ForgeXCurve curve2, MockQuote usdc) = forgePair();
        usdc.mint(trader, 1_000_000);
        vm.startPrank(trader);
        usdc.approve(address(curve2), type(uint256).max);
        curve2.buy(1000, type(int256).max, FAR_DEADLINE);
        uint256 before = usdc.balanceOf(trader);
        uint256 net = uint256(curve2.sell(500, 0, FAR_DEADLINE));
        vm.stopPrank();

        assertEq(usdc.balanceOf(trader), before + net);
        assertEq(token2.balanceOf(trader), 500);
    }

    function test_buy_sell_symmetry_without_fees() public {
        assertEq(curve.get_fee_rate(), 0);

        vm.prank(trader);
        int256 buyCost = curve.buy(1000, type(int256).max, FAR_DEADLINE);
        int256 reserveAfterBuy = curve.get_reserve();
        assertEq(reserveAfterBuy, buyCost);

        vm.prank(trader);
        int256 sellPayout = curve.sell(1000, 0, FAR_DEADLINE);

        assertEq(sellPayout, buyCost);
        assertEq(curve.get_reserve(), 0, "the curve empties again when the last holder exits");
    }

    // --------------------------------------------------------------------- guards

    function test_trades_respect_deadline() public {
        vm.warp(1_000_000);

        vm.prank(trader);
        curve.buy(1000, type(int256).max, 1_000_000);

        vm.warp(1_000_001);
        vm.prank(trader);
        vm.expectRevert(ForgeXCurve.DeadlineExpired.selector);
        curve.buy(100, type(int256).max, 1_000_000);

        vm.prank(trader);
        vm.expectRevert(ForgeXCurve.DeadlineExpired.selector);
        curve.sell(100, 0, 1_000_000);

        vm.prank(trader);
        curve.sell(500, 0, 1_000_001);
        assertEq(curve.get_tokens_sold(), 500);
    }

    // ---------------------------------------------------------------------- fees

    function test_fee_rate_initialization() public view {
        assertEq(curve.get_fee_rate(), 0);
    }

    function test_set_fee_rate_admin_only() public {
        vm.prank(admin);
        curve.set_fee_rate(100);
        assertEq(curve.get_fee_rate(), 100);

        vm.prank(admin);
        vm.expectRevert(ForgeXCurve.InvalidFeeRate.selector);
        curve.set_fee_rate(10001);

        vm.prank(admin);
        vm.expectRevert(ForgeXCurve.InvalidFeeRate.selector);
        curve.set_fee_rate(-1);

        vm.prank(stranger);
        vm.expectRevert(ForgeXCurve.UnauthorizedError.selector);
        curve.set_fee_rate(1);
    }

    function test_admin_fees_on_buy_and_sell() public {
        vm.startPrank(admin);
        curve.set_fee_rate(100);
        vm.stopPrank();

        vm.deal(trader, type(uint256).max);
        vm.startPrank(trader);
        int256 owed = curve.buy(1000, type(int256).max, FAR_DEADLINE);
        int256 feesAfterBuy = curve.get_admin_fees();
        assertGt(feesAfterBuy, 0);
        int256 sellNet = curve.sell(500, 0, FAR_DEADLINE);
        int256 feesAfterSell = curve.get_admin_fees();
        vm.stopPrank();

        assertGt(feesAfterSell, feesAfterBuy, "fees accumulate from both sides");
        assertGt(sellNet, 0);
        // Reserve plus accrued fees always equals the curve's own quote balance, which is
        // what makes withdrawing fees safe.
        assertEq(curve.get_reserve() + feesAfterSell, int256(usdc.balanceOf(address(curve))));
    }

    function test_withdraw_fees_admin_only() public {
        vm.startPrank(admin);
        curve.set_fee_rate(100);
        vm.stopPrank();

        vm.deal(trader, type(uint256).max);
        vm.prank(trader);
        curve.buy(1000, type(int256).max, FAR_DEADLINE);
        int256 fees = curve.get_admin_fees();
        assertGt(fees, 0);

        vm.prank(stranger);
        vm.expectRevert(ForgeXCurve.UnauthorizedError.selector);
        curve.withdraw_fees(creator);

        uint256 before = usdc.balanceOf(creator);
        vm.prank(admin);
        int256 withdrawn = curve.withdraw_fees(creator);
        assertEq(withdrawn, fees);
        assertEq(curve.get_admin_fees(), 0);
        assertEq(usdc.balanceOf(creator), before + uint256(fees), "fees are actually paid out, not just zeroed");
    }

    function test_withdraw_fees_fails_when_no_fees() public {
        vm.prank(admin);
        vm.expectRevert(ForgeXCurve.NoFeesToWithdraw.selector);
        curve.withdraw_fees(creator);
    }

    function test_fees_are_never_paid_out_of_the_reserve() public {
        // ERC20 quote: paying out fees must never touch the reserve that backs sellers.
        (ForgeXToken token2, ForgeXCurve curve2, MockQuote usdc) = forgePair();
        vm.startPrank(admin);
        curve2.set_fee_rate(500);
        vm.stopPrank();

        usdc.mint(trader, 1_000_000);
        vm.startPrank(trader);
        usdc.approve(address(curve2), type(uint256).max);
        int256 owed = curve2.buy(1000, type(int256).max, FAR_DEADLINE);
        vm.stopPrank();

        vm.prank(admin);
        int256 withdrawn = curve2.withdraw_fees(admin);
        assertEq(withdrawn, (curve2.get_reserve() * 500) / 10_000, "the fee is borrowed from the cost");
        assertEq(usdc.balanceOf(address(curve2)), uint256(curve2.get_reserve()), "the reserve is untouched");
        assertEq(usdc.balanceOf(admin), uint256(withdrawn));
    }

    // -------------------------------------------------------------------- limits

    function test_buy_sell_size_limits() public {
        vm.startPrank(admin);
        curve.set_buy_limits(100, 5000);
        vm.stopPrank();

        vm.prank(trader);
        vm.expectRevert(ForgeXCurve.BuyBelowMinimum.selector);
        curve.buy(50, type(int256).max, FAR_DEADLINE);

        vm.prank(trader);
        curve.buy(1000, type(int256).max, FAR_DEADLINE);

        vm.prank(trader);
        vm.expectRevert(ForgeXCurve.BuyExceedsMaximum.selector);
        curve.buy(6000, type(int256).max, FAR_DEADLINE);
    }

    function test_sell_size_limits() public {
        vm.prank(trader);
        curve.buy(2000, type(int256).max, FAR_DEADLINE);

        vm.startPrank(admin);
        curve.set_sell_limits(100, 1000);
        vm.stopPrank();

        vm.prank(trader);
        vm.expectRevert(ForgeXCurve.SellBelowMinimum.selector);
        curve.sell(50, 0, FAR_DEADLINE);

        vm.prank(trader);
        curve.sell(500, 0, FAR_DEADLINE);

        vm.prank(trader);
        vm.expectRevert(ForgeXCurve.SellExceedsMaximum.selector);
        curve.sell(1500, 0, FAR_DEADLINE);
    }

    function test_set_buy_and_sell_limits_reject_inverted_ranges() public {
        vm.startPrank(admin);
        vm.expectRevert(ForgeXCurve.InvalidBuyLimits.selector);
        curve.set_buy_limits(10, 1);
        vm.expectRevert(ForgeXCurve.InvalidSellLimits.selector);
        curve.set_sell_limits(10, 1);
        vm.stopPrank();
    }

    // --------------------------------------------------------------- graduation

    function test_curve_cap_graduation() public {
        vm.startPrank(admin);
        curve.set_cap(1000);
        vm.stopPrank();
        assertFalse(curve.is_graduated());

        vm.prank(trader);
        curve.buy(1000, type(int256).max, FAR_DEADLINE);
        assertTrue(curve.is_graduated());

        vm.prank(trader);
        vm.expectRevert(ForgeXCurve.CapExceeded.selector);
        curve.buy(1, type(int256).max, FAR_DEADLINE);
    }

    function test_graduated_flag_prevents_buys() public {
        vm.startPrank(admin);
        curve.set_cap(1000);
        vm.stopPrank();

        vm.prank(trader);
        curve.buy(1000, type(int256).max, FAR_DEADLINE);
        assertTrue(curve.is_graduated());

        vm.prank(trader);
        vm.expectRevert(ForgeXCurve.CapExceeded.selector);
        curve.buy(1, type(int256).max, FAR_DEADLINE);
    }

    function test_set_cap_rejects_cap_below_tokens_sold() public {
        vm.prank(trader);
        curve.buy(1000, type(int256).max, FAR_DEADLINE);

        vm.prank(admin);
        vm.expectRevert(ForgeXCurve.InvalidCap.selector);
        curve.set_cap(999);
    }

    function test_set_cap_admin_only() public {
        vm.prank(stranger);
        vm.expectRevert(ForgeXCurve.UnauthorizedError.selector);
        curve.set_cap(1);
    }

    // --------------------------------------------------------------- properties

    function test_reserve_ratio_query() public {
        assertEq(curve.get_reserve_ratio(), 0);

        vm.prank(trader);
        curve.buy(1000, type(int256).max, FAR_DEADLINE);
        assertGt(curve.get_reserve_ratio(), 0);
    }

    function test_buy_and_sell_price_queries() public {
        int256 priceBefore = curve.get_price();
        int256 buyPrice = curve.get_buy_price();
        int256 sellPrice = curve.get_sell_price();
        assertEq(priceBefore, buyPrice);
        assertEq(buyPrice, sellPrice);

        vm.prank(trader);
        curve.buy(1000, type(int256).max, FAR_DEADLINE);
        assertGt(curve.get_price(), priceBefore);
    }

    function test_reserve_always_non_negative() public {
        vm.startPrank(trader);
        for (uint256 i = 0; i < 5; ++i) {
            curve.buy(100, type(int256).max, FAR_DEADLINE);
            assertGe(curve.get_reserve(), 0);
        }
        vm.stopPrank();
    }

    function test_tokens_sold_never_decreases_on_buy() public {
        vm.startPrank(trader);
        int256 prevTokens = 0;
        for (uint256 i = 1; i <= 5; ++i) {
            curve.buy(100, type(int256).max, FAR_DEADLINE);
            int256 tokens = curve.get_tokens_sold();
            assertEq(tokens, prevTokens + 100);
            prevTokens = tokens;
        }
        vm.stopPrank();
    }

    function test_price_increases_monotonically_on_buys() public {
        vm.deal(trader, type(uint256).max);
        vm.startPrank(trader);
        int256 prevPrice = curve.get_price();
        for (uint256 i = 0; i < 5; ++i) {
            curve.buy(100, type(int256).max, FAR_DEADLINE);
            int256 price = curve.get_price();
            assertGt(price, prevPrice);
            prevPrice = price;
        }
        vm.stopPrank();
    }

    function test_admin_fees_never_exceed_total_traded() public {
        vm.startPrank(admin);
        curve.set_fee_rate(500);
        vm.stopPrank();

        vm.deal(trader, type(uint256).max);
        vm.startPrank(trader);
        int256 total = 0;
        for (uint256 i = 0; i < 5; ++i) {
            total += 1000;
            curve.buy(1000, type(int256).max, FAR_DEADLINE);
        }
        vm.stopPrank();

        int256 fees = curve.get_admin_fees();
        assertGe(fees, 0);
        assertLt(fees, total);
    }

    function test_market_cap_is_consistent_with_price_and_supply() public {
        vm.prank(trader);
        curve.buy(500, type(int256).max, FAR_DEADLINE);

        IForgeXTypes.CurveInfo memory info = curve.get_curve_info();
        assertEq(info.market_cap, (info.price * info.tokens_sold) / 10_000_000);
    }

    function test_reserve_equals_sum_of_costs_minus_fees() public {
        vm.startPrank(admin);
        curve.set_fee_rate(1000);
        vm.stopPrank();

        vm.deal(trader, type(uint256).max);
        vm.startPrank(trader);
        int256 owed1 = curve.buy(100, type(int256).max, FAR_DEADLINE);
        assertEq(curve.get_reserve() + curve.get_admin_fees(), owed1);

        int256 owed2 = curve.buy(100, type(int256).max, FAR_DEADLINE);
        assertEq(curve.get_reserve() + curve.get_admin_fees(), owed1 + owed2);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------ upgrade

    function test_upgrade_switches_the_proxy_implementation() public {
        ForgeXCurve fresh = new ForgeXCurve();
        vm.prank(admin);
        curve.upgrade(address(fresh));

        assertEq(ForgeXProxy(payable(address(curve))).implementation(), address(fresh));
        // State survives the upgrade.
        assertEq(curve.get_price(), INITIAL_PRICE);
    }

    function test_upgrade_requires_admin() public {
        ForgeXCurve fresh = new ForgeXCurve();
        vm.prank(stranger);
        vm.expectRevert(ForgeXCurve.UnauthorizedError.selector);
        curve.upgrade(address(fresh));
    }

    function test_upgrade_rejects_code_less_implementation() public {
        vm.prank(admin);
        vm.expectRevert(ForgeXCurve.ImplementationHasNoCode.selector);
        curve.upgrade(address(0));
    }
}
