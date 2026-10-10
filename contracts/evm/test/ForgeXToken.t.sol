// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {ForgeXToken} from "../src/ForgeXToken.sol";
import {IForgeXToken} from "../src/interfaces/IForgeXToken.sol";
import {IForgeXTransferHook} from "../src/interfaces/IForgeXTransferHook.sol";
import {MockTransferHook} from "./mocks/Mocks.sol";
import {IForgeXTypes} from "../src/interfaces/IForgeXTypes.sol";

/// @title ForgeXTokenTest
/// @notice Ports `contracts/stellar/token/src/test.rs` to Foundry. The SEP-41 three-argument
///         `transfer(from, to, amount)` is spelled `admin_transfer` on EVM, and the ERC20
///         `transferFrom` replaces SEP-41 `transfer_from(spender, from, to, amount)`.
contract ForgeXTokenTest is Base {
    ForgeXToken internal token;

    function setUp() public override {
        super.setUp();
        // Deployed directly with the curve as minter, the way the factory does.
        token = deployTokenProxy(tokenInitData(admin, creator));
    }

    // ------------------------------------------------------------- metadata

    function test_initialize_rejects_invalid_metadata() public {
        // Empty name, empty symbol, and over-long name or symbol are all refused, matching
        // the Soroban `TokenMetadata::validate` rules.
        vm.expectRevert(ForgeXToken.InvalidMetadataError.selector);
        deployTokenProxy(tokenInitDataNamed(admin, creator, "", "T"));
        vm.expectRevert(ForgeXToken.InvalidMetadataError.selector);
        deployTokenProxy(tokenInitDataNamed(admin, creator, "T", ""));
        vm.expectRevert(ForgeXToken.InvalidMetadataError.selector);
        deployTokenProxy(tokenInitDataNamed(admin, creator, "nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn", "T"));
        vm.expectRevert(ForgeXToken.InvalidMetadataError.selector);
        deployTokenProxy(tokenInitDataNamed(admin, creator, "T", "sssssssssssssssssssssssssssssssss"));

        // A 32-byte name is still valid: the limit is inclusive.
        ForgeXToken edge = deployTokenProxy(tokenInitDataNamed(admin, creator, "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"));
        assertEq(edge.name(), "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
        assertEq(edge.symbol(), "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    }

    function test_initialize_stores_metadata() public view {
        assertEq(token.max_supply(), MAX_SUPPLY);
        assertEq(token.decimals(), 7);
    }

    function test_sep41_fixed_function_queries() public view {
        assertEq(token.name(), "Test Token");
        assertEq(token.symbol(), "TEST");
        assertEq(token.decimals(), 7);
    }

    function test_token_cannot_be_reinitialized() public {
        vm.expectRevert(ForgeXToken.AlreadyInitializedError.selector);
        token.initialize(address(this), admin, creator, "Other", "OTHR", 7, 1);
    }

    function test_version_reports_interface_and_implementation() public view {
        (uint32 interfaceVersion, uint32 implementationVersion) = token.version();
        assertEq(interfaceVersion, 1);
        assertEq(implementationVersion, 3);
    }

    // ------------------------------------------------------------------ mint

    function test_mint_and_balance() public {
        vm.prank(admin);
        token.mint(trader, 1000);
        assertEq(token.balanceOf(trader), 1000);
        assertEq(token.totalSupply(), 1000);
    }

    function test_mint_rejects_non_positive_amounts() public {
        vm.startPrank(admin);
        vm.expectRevert(ForgeXToken.NegativeAmountError.selector);
        token.mint(trader, 0);
        vm.stopPrank();
    }

    function test_mint_requires_admin_or_minter() public {
        vm.prank(stranger);
        vm.expectRevert(ForgeXToken.UnauthorizedError.selector);
        token.mint(trader, 1000);

        // The minter is the curve, so a curve-shaped caller may mint.
        vm.prank(creator);
        token.mint(trader, 10);
        assertEq(token.balanceOf(trader), 10);
    }

    function test_max_supply_is_enforced_on_mint() public {
        ForgeXToken small = deployTokenProxy(
            abi.encodeCall(ForgeXToken.initialize, (address(this), admin, creator, "Small", "SMALL", 7, 100))
        );
        vm.prank(admin);
        small.mint(trader, 100);
        assertEq(small.totalSupply(), 100);

        vm.prank(admin);
        vm.expectRevert(ForgeXToken.MaxSupplyError.selector);
        small.mint(trader, 1);
    }

    function test_burn() public {
        vm.startPrank(admin);
        token.mint(trader, 1000);
        token.burn(trader, 400);
        vm.stopPrank();
        assertEq(token.balanceOf(trader), 600);
        assertEq(token.totalSupply(), 600);
    }

    function test_burn_rejects_insufficient_balance() public {
        vm.startPrank(admin);
        token.mint(trader, 10);
        vm.expectRevert(ForgeXToken.BalanceError.selector);
        token.burn(trader, 11);
        vm.stopPrank();
    }

    function test_burn_requires_admin_or_minter() public {
        vm.prank(admin);
        token.mint(trader, 1000);

        vm.prank(stranger);
        vm.expectRevert(ForgeXToken.UnauthorizedError.selector);
        token.burn(trader, 1);
    }

    // -------------------------------------------------------------- transfer

    function test_transfer() public {
        vm.startPrank(admin);
        token.mint(trader, 1000);
        vm.stopPrank();

        vm.prank(trader);
        token.transfer(other, 400);
        assertEq(token.balanceOf(trader), 600);
        assertEq(token.balanceOf(other), 400);
    }

    function test_transfer_rejects_insufficient_balance() public {
        vm.startPrank(admin);
        token.mint(trader, 100);
        vm.stopPrank();

        vm.prank(trader);
        vm.expectRevert(ForgeXToken.BalanceError.selector);
        token.transfer(other, 101);
    }

    function test_transfer_emits_erc20_event() public {
        vm.startPrank(admin);
        token.mint(trader, 1000);
        vm.stopPrank();

        vm.expectEmit(true, true, false, true, address(token));
        emit IForgeXToken.Transfer(trader, other, 400);
        vm.prank(trader);
        token.transfer(other, 400);
    }

    // -------------------------------------------------------------- approval

    function test_approve_and_allowance() public {
        vm.prank(trader);
        token.approve(other, 500);
        assertEq(token.allowance(trader, other), 500);
    }

    function test_transferFrom_consumes_allowance() public {
        vm.startPrank(admin);
        token.mint(trader, 1000);
        vm.stopPrank();

        vm.prank(trader);
        token.approve(other, 400);

        vm.prank(other);
        token.transferFrom(trader, creator, 400);
        assertEq(token.balanceOf(trader), 600);
        assertEq(token.balanceOf(creator), 400);
        assertEq(token.allowance(trader, other), 0);
    }

    function test_transferFrom_rejects_overspend_without_moving_funds() public {
        vm.startPrank(admin);
        token.mint(trader, 1000);
        vm.stopPrank();

        vm.prank(trader);
        token.approve(other, 400);

        vm.prank(other);
        vm.expectRevert(ForgeXToken.AllowanceError.selector);
        token.transferFrom(trader, creator, 401);

        assertEq(token.balanceOf(trader), 1000);
        assertEq(token.allowance(trader, other), 400);
    }

    function test_transferFrom_rejects_zero_allowance() public {
        vm.startPrank(admin);
        token.mint(trader, 1000);
        vm.stopPrank();

        vm.prank(other);
        vm.expectRevert(ForgeXToken.AllowanceError.selector);
        token.transferFrom(trader, creator, 1);
    }

    // ------------------------------------------------------- admin transfer

    function test_admin_transfer_moves_tokens() public {
        vm.startPrank(admin);
        token.mint(trader, 1000);
        token.admin_transfer(trader, creator, 400);
        vm.stopPrank();

        assertEq(token.balanceOf(trader), 600);
        assertEq(token.balanceOf(creator), 400);
    }

    function test_admin_transfer_requires_admin_and_valid_destination() public {
        vm.startPrank(admin);
        token.mint(trader, 1000);
        vm.stopPrank();

        vm.prank(stranger);
        vm.expectRevert(ForgeXToken.UnauthorizedError.selector);
        token.admin_transfer(trader, creator, 1);

        // A revoked destination refuses the rescue transfer, like Soroban.
        vm.startPrank(admin);
        token.set_authorized(creator, false);
        vm.expectRevert(ForgeXToken.UnauthorizedError.selector);
        token.admin_transfer(trader, creator, 1);
        vm.stopPrank();
    }

    // ------------------------------------------------------------- ownership

    function test_set_admin_transfers_ownership() public {
        vm.prank(admin);
        token.set_admin(creator);
        assertEq(token.admin(), creator);

        // The new admin can now mint.
        vm.prank(creator);
        token.mint(trader, 1);

        // The old admin cannot.
        vm.prank(admin);
        vm.expectRevert(ForgeXToken.UnauthorizedError.selector);
        token.mint(trader, 1);
    }

    function test_set_admin_requires_admin_and_valid_target() public {
        vm.prank(stranger);
        vm.expectRevert(ForgeXToken.UnauthorizedError.selector);
        token.set_admin(creator);

        vm.prank(admin);
        vm.expectRevert(ForgeXToken.UnauthorizedError.selector);
        token.set_admin(address(0));
    }

    function test_admin_cannot_self_revoke() public {
        vm.prank(admin);
        vm.expectRevert(ForgeXToken.UnauthorizedError.selector);
        token.set_authorized(admin, false);

        assertTrue(token.authorized(admin));
    }

    // --------------------------------------------------------- authorization

    function test_authorized_defaults_to_true() public view {
        assertTrue(token.authorized(trader));
        assertTrue(token.authorized(stranger));
    }

    function test_set_authorized_revokes_and_restores() public {
        vm.startPrank(admin);
        token.set_authorized(trader, false);
        vm.stopPrank();
        assertFalse(token.authorized(trader));

        vm.startPrank(admin);
        token.mint(trader, 1000);
        vm.stopPrank();

        vm.prank(trader);
        vm.expectRevert(ForgeXToken.UnauthorizedError.selector);
        token.transfer(other, 1);

        vm.prank(admin);
        vm.expectRevert(ForgeXToken.UnauthorizedError.selector);
        token.transfer(trader, 1);

        vm.startPrank(admin);
        token.set_authorized(trader, true);
        vm.stopPrank();
        vm.prank(trader);
        token.transfer(other, 1000);
    }

    // --------------------------------------------------------------- pausing

    function test_set_paused_requires_admin() public {
        vm.prank(stranger);
        vm.expectRevert(ForgeXToken.UnauthorizedError.selector);
        token.set_paused(true);

        assertFalse(token.paused());
    }

    function test_paused_blocks_value_moving_operations() public {
        vm.startPrank(admin);
        token.mint(trader, 1000);
        token.set_paused(true);
        vm.stopPrank();

        vm.prank(trader);
        vm.expectRevert(ForgeXToken.ContractPausedError.selector);
        token.transfer(other, 1);

        vm.prank(trader);
        vm.expectRevert(ForgeXToken.ContractPausedError.selector);
        token.approve(other, 1);

        vm.startPrank(admin);
        vm.expectRevert(ForgeXToken.ContractPausedError.selector);
        token.burn(trader, 1);
        vm.stopPrank();

        // Reads stay available while halted.
        assertEq(token.balanceOf(trader), 1000);

        vm.prank(admin);
        token.set_paused(false);
        vm.prank(trader);
        token.transfer(other, 1);
    }

    // ------------------------------------------------------------ transfer hook

    function test_set_transfer_hook_requires_admin() public {
        vm.prank(stranger);
        vm.expectRevert(ForgeXToken.UnauthorizedError.selector);
        token.set_transfer_hook(address(0));
    }

    function test_transfer_hook_cannot_be_the_token_itself() public {
        vm.prank(admin);
        vm.expectRevert(ForgeXToken.UnauthorizedError.selector);
        token.set_transfer_hook(address(token));
    }

    function test_transfer_invokes_hook_with_args() public {
        MockTransferHook hook = new MockTransferHook();
        vm.prank(admin);
        token.set_transfer_hook(address(hook));

        vm.startPrank(admin);
        token.mint(trader, 1000);
        vm.stopPrank();

        vm.prank(trader);
        token.transfer(other, 300);

        assertEq(hook.from(), trader);
        assertEq(hook.to(), other);
        assertEq(hook.amount(), 300);
        assertEq(hook.calls(), 1);
    }

    function test_clearing_transfer_hook_disables_it() public {
        MockTransferHook hook = new MockTransferHook();
        vm.startPrank(admin);
        token.set_transfer_hook(address(hook));
        token.mint(trader, 1000);
        token.set_transfer_hook(address(0));
        vm.stopPrank();

        vm.prank(trader);
        token.transfer(other, 100);
        assertEq(hook.calls(), 0);
    }

    function test_failing_transfer_hook_blocks_the_transfer() public {
        NeverAcceptingHook hook = new NeverAcceptingHook();
        vm.startPrank(admin);
        token.set_transfer_hook(address(hook));
        token.mint(trader, 1000);
        vm.stopPrank();

        vm.prank(trader);
        vm.expectRevert(ForgeXToken.HooksError.selector);
        token.transfer(other, 1);
        assertEq(token.balanceOf(trader), 1000, "a failing hook moves nothing");
    }

    function test_reentrant_transfer_hook_is_blocked() public {
        MockTransferHook hook = new MockTransferHook();
        hook.setReentrancy(true, address(token));
        vm.startPrank(admin);
        token.set_transfer_hook(address(hook));
        token.mint(trader, 1000);
        vm.stopPrank();

        vm.prank(trader);
        token.transfer(other, 100);
        // The nested transfer is refused, the outer one succeeds.
        assertEq(hook.calls(), 1);
        assertEq(token.balanceOf(trader), 900);
    }

    // ---------------------------------------------------------------- upgrade

    function test_upgrade_bumps_implementation_version() public {
        ForgeXToken fresh = new ForgeXToken();
        vm.prank(admin);
        token.upgrade(address(fresh));

        (, uint32 implementationVersion) = token.version();
        assertEq(implementationVersion, 4);
    }

    function test_upgrade_requires_admin() public {
        vm.prank(stranger);
        vm.expectRevert(ForgeXToken.UnauthorizedError.selector);
        token.upgrade(address(0));
    }
}

/// @notice Hook that always reverts, so failures fail closed.
contract NeverAcceptingHook is IForgeXTransferHook {
    function onTransfer(address, address, uint256) external pure {
        revert("NeverAcceptingHook: no");
    }
}
