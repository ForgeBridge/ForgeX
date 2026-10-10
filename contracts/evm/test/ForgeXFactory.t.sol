// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {Vm} from "forge-std/Vm.sol";
import {ForgeXFactory} from "../src/ForgeXFactory.sol";
import {ForgeXProxy} from "../src/ForgeXProxy.sol";
import {IForgeXTypes} from "../src/interfaces/IForgeXTypes.sol";
import {ForgeXToken} from "../src/ForgeXToken.sol";
import {MockQuote} from "./mocks/Mocks.sol";
import {ForgeXCurve} from "../src/ForgeXCurve.sol";

/// @title ForgeXFactoryTest
/// @notice Ports `contracts/stellar/factory/src/test.rs` to Foundry. On EVM the creator is
///         `msg.sender` rather than an explicitly authorized argument, and the trusted
///         WASM hashes become implementation addresses.
contract ForgeXFactoryTest is Base {
    string[] internal names;
    string[] internal symbols;

    function setUp() public override {
        super.setUp();
        names = ["Test Token", "Live", "Alpha", "Beta"];
        symbols = ["TEST", "LIVE", "ALPHA", "BETA"];
    }

    function paramsFor(string memory name_, string memory symbol_) internal view returns (IForgeXTypes.CreateTokenParams memory) {
        IForgeXTypes.CreateTokenParams memory p = defaultParams();
        p.name = name_;
        p.symbol = symbol_;
        return p;
    }

    // ------------------------------------------------------------- initialize

    function test_initialize() public view {
        assertEq(factory.get_admin(), admin);
        assertEq(factory.token_implementation(), address(tokenImpl));
        assertEq(factory.curve_implementation(), address(curveImpl));
        assertEq(factory.deploy_nonce(), 0);
        assertEq(factory.token_count(), 0);
        assertEq(factory.quote_token(), address(0), "native quote until the factory says otherwise");
    }

    function test_set_admin_transfers_ownership() public {
        vm.prank(stranger);
        vm.expectRevert(ForgeXFactory.Unauthorized.selector);
        factory.set_admin(creator);

        vm.prank(admin);
        factory.set_admin(creator);
        assertEq(factory.get_admin(), creator);

        // The previous admin loses their privileges.
        vm.prank(admin);
        vm.expectRevert(ForgeXFactory.Unauthorized.selector);
        factory.remove_token(address(1));

        vm.prank(creator);
        factory.set_admin(admin);
    }

    function test_set_admin_rejects_non_existent_address() public {
        vm.prank(admin);
        vm.expectRevert(ForgeXFactory.InvalidAdminAddress.selector);
        factory.set_admin(address(0));
    }

    function test_set_implementations_require_admin() public {
        ForgeXToken freshToken = new ForgeXToken();
        ForgeXCurve freshCurve = new ForgeXCurve();

        vm.prank(stranger);
        vm.expectRevert(ForgeXFactory.Unauthorized.selector);
        factory.set_token_implementation(address(freshToken));

        vm.prank(admin);
        factory.set_token_implementation(address(freshToken));
        assertEq(factory.token_implementation(), address(freshToken));

        vm.prank(admin);
        factory.set_curve_implementation(address(freshCurve));
        assertEq(factory.curve_implementation(), address(freshCurve));

        // New tokens are deployed from the updated implementations.
        vm.prank(creator);
        (address tokenId,) = factory.create_token(paramsFor("Fresh", "FRESH"));
        assertEq(ForgeXToken(tokenId).name(), "Fresh");
    }

    // ----------------------------------------------------------- create_token

    function test_create_token_is_permissionless() public {
        // A non-admin forges their own token and owns both contracts outright.
        vm.prank(creator);
        (address tokenId, address curveId) = factory.create_token(paramsFor("Test Token", "TEST"));

        IForgeXTypes.TokenInfo memory info = factory.get_token(tokenId);
        assertEq(info.creator, creator);
        assertEq(info.token_id, tokenId);
        assertEq(info.curve_id, curveId);
        assertFalse(tokenId == curveId);

        // The creator administers the token and the curve.
        assertEq(ForgeXToken(tokenId).admin(), creator);
        assertEq(ForgeXCurve(curveId).admin(), creator);
        // And the curve is the token's mutating minter, so trades are self-contained.
        assertEq(ForgeXToken(tokenId).minter(), curveId);
    }

    function test_create_token_deploys_live_code() public {
        vm.prank(creator);
        (address tokenId, address curveId) = factory.create_token(paramsFor("Test Token", "TEST"));

        assertGt(tokenId.code.length, 0);
        assertGt(curveId.code.length, 0);
        // Both proxies point at the shared implementations.
        assertEq(ForgeXProxy(payable(tokenId)).implementation(), address(tokenImpl));
        assertEq(ForgeXProxy(payable(curveId)).implementation(), address(curveImpl));
    }

    function test_create_token_initializes_deployed_contracts() public {
        vm.prank(creator);
        (address tokenId, address curveId) = factory.create_token(paramsFor("Live", "LIVE"));

        ForgeXToken token = ForgeXToken(tokenId);
        assertEq(token.name(), "Live");
        assertEq(token.symbol(), "LIVE");
        assertEq(token.decimals(), 7);

        ForgeXCurve curve = ForgeXCurve(curveId);
        assertEq(curve.token(), tokenId);
        assertEq(curve.get_price(), paramsFor("Live", "LIVE").initial_price);
    }

    function test_create_token_addresses_are_unique_across_forges() public {
        vm.prank(creator);
        (address tokenA, address curveA) = factory.create_token(paramsFor("Alpha", "ALPHA"));
        vm.prank(creator);
        (address tokenB, address curveB) = factory.create_token(paramsFor("Beta", "BETA"));

        assertFalse(tokenA == tokenB);
        assertFalse(curveA == curveB);
        assertEq(factory.token_count(), 2);
    }

    function test_create_token_after_removal_redeploys_fresh_addresses() public {
        vm.prank(creator);
        (address tokenA,) = factory.create_token(paramsFor("Alpha", "ALPHA"));

        vm.prank(admin);
        factory.remove_token(tokenA);
        assertEq(factory.token_count(), 0);

        // The deployment nonce never rewinds, so re-forging cannot collide.
        vm.prank(creator);
        (address tokenB, address curveB) = factory.create_token(paramsFor("Beta", "BETA"));
        assertFalse(tokenA == tokenB);
        assertTrue(factory.has_token(tokenB));
    }

    function test_create_token_rejects_duplicate_name() public {
        vm.prank(creator);
        factory.create_token(paramsFor("Alpha", "ALPHA"));

        vm.prank(creator);
        vm.expectRevert(ForgeXFactory.TokenExists.selector);
        factory.create_token(paramsFor("Alpha", "BETA"));
    }

    function test_create_token_rejects_duplicate_symbol() public {
        vm.prank(creator);
        factory.create_token(paramsFor("Alpha", "ALPHA"));

        vm.prank(creator);
        vm.expectRevert(ForgeXFactory.TokenExists.selector);
        factory.create_token(paramsFor("Beta", "ALPHA"));
    }

    function test_create_token_names_and_symbols_are_reusable_after_removal() public {
        vm.prank(creator);
        (address tokenA,) = factory.create_token(paramsFor("Alpha", "ALPHA"));
        vm.prank(admin);
        factory.remove_token(tokenA);

        assertFalse(factory.has_name("Alpha"));
        assertFalse(factory.has_symbol("ALPHA"));

        vm.prank(creator);
        factory.create_token(paramsFor("Alpha", "ALPHA"));
    }

    function test_create_token_rejects_invalid_metadata() public {
        // Empty name or symbol.
        IForgeXTypes.CreateTokenParams memory emptyName = paramsFor("Alpha", "ALPHA");
        emptyName.name = "";
        vm.prank(creator);
        vm.expectRevert(ForgeXFactory.InvalidMetadata.selector);
        factory.create_token(emptyName);

        // Over-long name.
        IForgeXTypes.CreateTokenParams memory longName = paramsFor("Alpha", "ALPHA");
        longName.name = "333333333333333333333333333333333";
        vm.prank(creator);
        vm.expectRevert(ForgeXFactory.InvalidMetadata.selector);
        factory.create_token(longName);

        // Over-long image URI.
        IForgeXTypes.CreateTokenParams memory longUri = paramsFor("Alpha", "ALPHA");
        longUri.image_uri = "iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii";
        vm.prank(creator);
        vm.expectRevert(ForgeXFactory.InvalidMetadata.selector);
        factory.create_token(longUri);

        // Over-long description.
        IForgeXTypes.CreateTokenParams memory longDescription = paramsFor("Alpha", "ALPHA");
        longDescription.description = "ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
        vm.prank(creator);
        vm.expectRevert(ForgeXFactory.InvalidMetadata.selector);
        factory.create_token(longDescription);

        // Nothing was deployed by the rejected attempts.
        assertEq(factory.token_count(), 0);
        assertEq(factory.deploy_nonce(), 0);
    }

    function test_create_token_rejects_invalid_curve_params() public {
        IForgeXTypes.CreateTokenParams memory flat = paramsFor("Alpha", "ALPHA");
        flat.initial_price = 0;
        vm.prank(creator);
        vm.expectRevert(ForgeXFactory.InvalidCurveParams.selector);
        factory.create_token(flat);

        IForgeXTypes.CreateTokenParams memory noSteepness = paramsFor("Alpha", "ALPHA");
        noSteepness.steepness = 0;
        vm.prank(creator);
        vm.expectRevert(ForgeXFactory.InvalidCurveParams.selector);
        factory.create_token(noSteepness);

        IForgeXTypes.CreateTokenParams memory negativeTarget = paramsFor("Alpha", "ALPHA");
        negativeTarget.reserve_target = -1;
        vm.prank(creator);
        vm.expectRevert(ForgeXFactory.InvalidCurveParams.selector);
        factory.create_token(negativeTarget);
    }

    function test_token_created_emits_full_details() public {
        vm.recordLogs();
        vm.prank(creator);
        (address tokenId, address curveId) = factory.create_token(paramsFor("Test Token", "TEST"));

        // A single event, keyed by the creator and the token, carrying the whole registry
        // record so an indexer needs no follow-up read.
        Vm.Log[] memory entries = vm.getRecordedLogs();
        assertEq(entries.length, 1);
        assertEq(
            entries[0].topics[0],
            keccak256(
                "TokenCreated(address,address,address,string,string,uint8,uint256,string,string,uint64)"
            )
        );
        assertEq(address(uint160(uint256(entries[0].topics[1]))), creator);
        assertEq(address(uint160(uint256(entries[0].topics[2]))), tokenId);

        IForgeXTypes.TokenInfo memory expected = factory.get_token(tokenId);
        // The creator and the token address live in topics; the data starts at the curve.
        address eventCreator = creator;
        address eventToken = tokenId;
        (
            address eventCurve,
            string memory eventName,
            string memory eventSymbol,
            uint8 eventDecimals,
            uint256 eventMaxSupply,
            string memory eventImageUri,
            string memory eventDescription,
            uint64 eventCreatedAt
        ) = abi.decode(entries[0].data, (address, string, string, uint8, uint256, string, string, uint64));

        assertEq(eventCreator, expected.creator);
        assertEq(eventToken, expected.token_id);
        assertEq(eventCurve, expected.curve_id);
        assertEq(eventName, expected.name);
        assertEq(eventSymbol, expected.symbol);
        assertEq(eventDecimals, expected.decimals);
        assertEq(eventMaxSupply, expected.max_supply);
        assertEq(eventImageUri, expected.image_uri);
        assertEq(eventDescription, expected.description);
        assertEq(eventCreatedAt, expected.created_at);
    }

    // -------------------------------------------------------------- registry

    function test_get_all_tokens_and_count() public {
        for (uint256 i = 0; i < names.length; ++i) {
            vm.prank(creator);
            factory.create_token(paramsFor(names[i], symbols[i]));
        }

        IForgeXTypes.TokenInfo[] memory all = factory.get_all_tokens();
        assertEq(all.length, names.length);
        assertEq(factory.token_count(), names.length);
        for (uint256 i = 0; i < names.length; ++i) {
            assertEq(all[i].name, names[i]);
            assertEq(all[i].symbol, symbols[i]);
        }
    }

    function test_get_token_returns_missing_address_as_not_found() public {
        vm.prank(creator);
        factory.create_token(defaultParams());

        vm.expectRevert(ForgeXFactory.TokenNotFound.selector);
        factory.get_token(makeAddr("missing"));
    }

    function test_get_token_by_name_and_symbol() public {
        vm.prank(creator);
        (address tokenId,) = factory.create_token(paramsFor("Alpha", "ALPHA"));

        assertEq(factory.get_token_by_name("Alpha"), tokenId);
        assertEq(factory.get_token_by_symbol("ALPHA"), tokenId);

        vm.expectRevert(ForgeXFactory.TokenNotFound.selector);
        factory.get_token_by_name("Nope");
        vm.expectRevert(ForgeXFactory.TokenNotFound.selector);
        factory.get_token_by_symbol("NOPE");
    }

    function test_remove_token() public {
        vm.prank(creator);
        (address tokenId,) = factory.create_token(paramsFor("Alpha", "ALPHA"));

        vm.expectRevert(ForgeXFactory.Unauthorized.selector);
        factory.remove_token(tokenId);

        vm.prank(admin);
        factory.remove_token(tokenId);
        assertEq(factory.token_count(), 0);
        assertFalse(factory.has_token(tokenId));
    }

    function test_remove_token_unknown() public {
        vm.prank(admin);
        vm.expectRevert(ForgeXFactory.TokenNotFound.selector);
        factory.remove_token(makeAddr("missing"));
    }

    function test_pagination_preserves_creation_order() public {
        for (uint256 i = 0; i < names.length; ++i) {
            vm.prank(creator);
            factory.create_token(paramsFor(names[i], symbols[i]));
        }

        // Paging with any window size and concatenating the results reproduces the
        // registry exactly, which is what the token feed relies on.
        for (uint64 window = 1; window < 5; ++window) {
            string[] memory rebuilt = new string[](names.length);
            for (uint64 offset = 0; offset < names.length; offset += window) {
                IForgeXTypes.TokenInfo[] memory page = factory.get_tokens_paginated(offset, window);
                for (uint256 j = 0; j < page.length; ++j) {
                    rebuilt[offset + j] = page[j].name;
                }
            }
            for (uint256 i = 0; i < names.length; ++i) {
                assertEq(rebuilt[i], names[i]);
            }
        }
    }

    function test_pagination_out_of_range_is_saturated() public {
        for (uint256 i = 0; i < names.length; ++i) {
            vm.prank(creator);
            factory.create_token(paramsFor(names[i], symbols[i]));
        }

        IForgeXTypes.TokenInfo[] memory tail = factory.get_tokens_paginated(2, 100);
        assertEq(tail.length, 2);
        assertEq(tail[0].name, names[2]);

        IForgeXTypes.TokenInfo[] memory overflow = factory.get_tokens_paginated(100, 100);
        assertEq(overflow.length, 0);

        IForgeXTypes.TokenInfo[] memory whole = factory.get_tokens_paginated(0, 100);
        assertEq(whole.length, names.length);
    }

    function test_pagination_after_removal_keeps_order() public {
        for (uint256 i = 0; i < names.length; ++i) {
            vm.prank(creator);
            factory.create_token(paramsFor(names[i], symbols[i]));
        }
        IForgeXTypes.TokenInfo[] memory all = factory.get_all_tokens();
        vm.prank(admin);
        factory.remove_token(all[1].token_id);

        IForgeXTypes.TokenInfo[] memory remainingTokens = factory.get_all_tokens();
        assertEq(remainingTokens.length, 3);
        assertEq(remainingTokens[0].name, names[0]);
        assertEq(remainingTokens[1].name, names[2]);
        assertEq(remainingTokens[2].name, names[3]);
    }

    // ------------------------------------------------------- end to end trade

    function test_a_forged_pair_trades_end_to_end() public {
        vm.prank(creator);
        (address tokenId, address curveId) = factory.create_token(paramsFor("Trade", "TRADE"));

        ForgeXCurve curve = ForgeXCurve(curveId);
        ForgeXToken token = ForgeXToken(tokenId);

        // Without a quote asset the curve settles in the native gas token, so pay the quote.
        uint256 owed = uint256(curve.quote_buy(1000));
        vm.prank(creator);
        curve.buy{value: owed}(1000, int256(owed), uint64(block.timestamp + 1));

        assertEq(token.balanceOf(creator), 1000);
        assertEq(curve.get_tokens_sold(), 1000);
        assertEq(uint256(curve.get_reserve()), owed);

        // Selling returns the same amount when there are no fees.
        vm.prank(creator);
        int256 net = curve.sell(1000, 0, uint64(block.timestamp + 1));
        assertEq(uint256(net), owed);
        assertEq(token.balanceOf(creator), 0);
        assertEq(curve.get_reserve(), 0);
    }

    function test_set_quote_token_applies_to_new_curves_only() public {
        MockQuote usdc = new MockQuote();
        vm.prank(admin);
        factory.set_quote_token(address(usdc));

        vm.prank(creator);
        (address tokenA, address curveA) = factory.create_token(paramsFor("Alpha", "ALPHA"));
        assertEq(ForgeXCurve(curveA).quote_token(), address(usdc));

        // Existing curves keep whatever they were deployed with, and changing the quote
        // later does not retarget them.
        vm.prank(admin);
        factory.set_quote_token(address(0));
        assertEq(ForgeXCurve(curveA).quote_token(), address(usdc));
    }
}
