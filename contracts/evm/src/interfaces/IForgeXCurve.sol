// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.24;

import {IForgeXTypes} from "./IForgeXTypes.sol";

import {BondingCurveMath} from "../libraries/BondingCurveMath.sol";

/// @title IForgeXCurve
/// @notice Exponential bonding curve for one ForgeX token on Arc.
///
/// @dev Method names mirror the Soroban curve contract 1:1 (`buy`, `sell`,
///      get_curve_info`, `set_fee_rate`, ...). The one deliberate difference: Soroban
///      requires an explicit `buyer`/`seller` argument that it then authorizes; on EVM
///      `msg.sender` is already authenticated, so those arguments are gone.
interface IForgeXCurve {    function initialize(
        address factory_,
        address token_,
        int256 initialPrice,
        int256 steepness,
        int256 reserveTarget,
        address admin_,
        address quoteToken_
    ) external;

    function buy(uint256 amount_out, int256 max_cost, uint64 deadline)
        external
        payable
        returns (int256 owed);

    function sell(uint256 amount_in, int256 min_payout, uint64 deadline)
        external
        payable
        returns (int256 net);

    function withdraw_fees(address recipient) external returns (int256 amount);

    function set_fee_rate(int256 fee_bps) external;

    function set_buy_limits(int256 min_buy, int256 max_buy) external;

    function set_sell_limits(int256 min_sell, int256 max_sell) external;

    function set_cap(int256 cap) external;

    function upgrade(address new_implementation) external;

    function get_price() external view returns (int256);

    function get_buy_price() external view returns (int256);

    function get_sell_price() external view returns (int256);

    function get_reserve() external view returns (int256);

    function get_tokens_sold() external view returns (int256);

    function get_market_cap() external view returns (int256);

    function get_admin_fees() external view returns (int256);

    function get_curve_info() external view returns (IForgeXTypes.CurveInfo memory);

    function get_curve_params() external view returns (int256 initialPrice, int256 steepness, int256 reserveTarget);

    function get_fee_rate() external view returns (int256);

    function get_buy_limits() external view returns (int256 min_buy, int256 max_buy);

    function get_sell_limits() external view returns (int256 min_sell, int256 max_sell);

    function get_cap() external view returns (int256);

    function is_graduated() external view returns (bool);

    function quote_buy(uint256 amount_out) external view returns (int256 owed);

    function quote_sell(uint256 amount_in) external view returns (int256 net);

    function get_reserve_ratio() external view returns (int256);

    function admin() external view returns (address);

    function token() external view returns (address);

    function quote_token() external view returns (address);

    function factory() external view returns (address);

    /// @param buyer the address that bought
    /// @param amountOut tokens newly issued
    /// @param cost reserve credit before fees
    /// @param fee fee routed to `admin_fees`
    /// @param newPrice price after the trade
    /// @param newReserve reserve after the trade
    /// @param newAdminFees accumulated admin fees after the trade
    event Buy(
        address indexed buyer,
        uint256 amountOut,
        int256 cost,
        int256 fee,
        int256 newPrice,
        int256 newReserve,
        int256 newAdminFees
    );
    event Sell(
        address indexed seller,
        uint256 amountIn,
        int256 payout,
        int256 fee,
        int256 newPrice,
        int256 newReserve,
        int256 newAdminFees
    );
    event WithdrawFees(address indexed admin, address indexed recipient, int256 amount);
    event SetFeeRate(address indexed admin, int256 rate);
    event SetBuyLimits(address indexed admin, int256 minBuy, int256 maxBuy);
    event SetSellLimits(address indexed admin, int256 minSell, int256 maxSell);
    event SetCap(address indexed admin, int256 cap);
    event Upgrade(address indexed admin, address indexed newImplementation);
}
