// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.24;

/// @title IForgeXTypes
/// @notice Factory parameter and registry types, shared with the TypeScript SDK.
/// @dev `TokenInfo` keeps the Soroban `TokenInfo` field order so the SDK can decode both
///      chains with one mapping table.
interface IForgeXTypes {
    struct CreateTokenParams {
        string name;
        string symbol;
        uint8 decimals;
        uint256 max_supply;
        string image_uri;
        string description;
        int256 initial_price;
        int256 steepness;
        int256 reserve_target;
    }

    /// @notice Full curve state. Mirrors the Soroban `CurveInfo` contracttype, with the
    ///         nested `CurveParams` flattened into three fields.
    struct CurveInfo {
        address token_id;
        int256 initial_price;
        int256 steepness;
        int256 reserve_target;
        int256 reserve;
        int256 tokens_sold;
        int256 price;
        int256 market_cap;
        address admin;
        int256 fee_rate;
        int256 cap;
        bool graduated;
        int256 admin_fees;
    }

    struct TokenInfo {
        address token_id;
        address curve_id;
        address creator;
        string name;
        string symbol;
        uint8 decimals;
        uint256 max_supply;
        string image_uri;
        string description;
        uint64 created_at;
    }
}
