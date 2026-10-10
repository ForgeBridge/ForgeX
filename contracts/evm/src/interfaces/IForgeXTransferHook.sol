// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.24;

/// @title IForgeXTransferHook
/// @notice Optional hook invoked before every value-moving transfer on a ForgeX token.
interface IForgeXTransferHook {
    function onTransfer(address from, address to, uint256 amount) external;
}
