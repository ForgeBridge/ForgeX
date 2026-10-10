// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {ForgeXToken} from "../src/ForgeXToken.sol";
import {ForgeXCurve} from "../src/ForgeXCurve.sol";
import {ForgeXFactory} from "../src/ForgeXFactory.sol";
import {ForgeXProxy} from "../src/ForgeXProxy.sol";
import {IForgeXTypes} from "../src/interfaces/IForgeXTypes.sol";
import {MockQuote, ReentrantQuote} from "./mocks/Mocks.sol";

/// @title Base
/// @notice Shared deployment helpers mirroring the Rust test harness. Each suite deploys
///         the shared implementations and wraps them in proxies the way `create_token`
///         does, so the tests run against the bytecode users interact with.
///
/// @dev Two quoting modes exist on Arc:
///        - `forgePair()` settles in an ERC20 USDC (what a production factory points at);
///        - `forgeNativePair()` settles in the native Arc gas token (USDC), where the curve
///          must be paid with exactly `quote_buy()`.
abstract contract Base is Test {
    address internal admin = makeAddr("admin");
    address internal creator = makeAddr("creator");
    address internal trader = makeAddr("trader");
    address internal other = makeAddr("other");
    address internal stranger = makeAddr("stranger");

    ForgeXToken internal tokenImpl;
    ForgeXCurve internal curveImpl;
    ForgeXFactory internal factory;

    /// @dev Params used by the Rust curve tests: initial_price 10_000_000, steepness 100.
    int256 internal constant INITIAL_PRICE = 10_000_000;
    int256 internal constant STEEPNESS = 100;
    int256 internal constant RESERVE_TARGET = 5_000_000_000_000;
    uint256 internal constant MAX_SUPPLY = 10_000_000_000_000_000;
    uint256 internal constant TRADER_FUNDING = 100_000_000_000;
    uint64 internal constant FAR_DEADLINE = type(uint64).max;

    function setUp() public virtual {
        tokenImpl = new ForgeXToken();
        curveImpl = new ForgeXCurve();
        factory = new ForgeXFactory(admin, address(tokenImpl), address(curveImpl));
        vm.deal(trader, 10 ** 30);
        vm.deal(other, 10 ** 30);
        vm.deal(creator, 10 ** 30);
    }

    /// @notice Native-quote trades must attach the exact quoted payment, so the quote has to
    ///         be read before the prank, otherwise the prank is consumed by the quote call
    ///         and the trade arrives from the test contract.
    function buyFrom(ForgeXCurve c, address trader_, uint256 amount, int256 maxCost, uint64 deadline)
        internal
        returns (int256 owed)
    {
        uint256 payment = uint256(c.quote_buy(amount));
        vm.prank(trader_);
        owed = c.buy{value: payment}(amount, maxCost, deadline);
    }

    function sellFrom(ForgeXCurve c, address seller_, uint256 amount, int256 minPayout, uint64 deadline)
        internal
        returns (int256 net)
    {
        vm.prank(seller_);
        net = c.sell(amount, minPayout, deadline);
    }

    /// @notice Deploys a token + curve pair settling in an ERC20 quote, the way the factory
    ///         does. The trader is pre-funded and pre-approved so tests read like trades.
    function forgePair() internal returns (ForgeXToken token, ForgeXCurve curve, MockQuote usdc) {
        usdc = new MockQuote();
        // The curve shell goes in uninitialized so the token can carry the curve as its
        // mutating minter, exactly the order the factory uses.
        curve = deployCurveProxy("");
        token = deployTokenProxy(tokenInitData(admin, address(curve)));
        curve.initialize(address(this), address(token), INITIAL_PRICE, STEEPNESS, RESERVE_TARGET, admin, address(usdc));
        usdc.mint(trader, TRADER_FUNDING);
        usdc.mint(other, TRADER_FUNDING);
        vm.prank(trader);
        usdc.approve(address(curve), type(uint256).max);
    }

    /// @notice Deploys a pair settling in the native Arc gas token.
    function forgeNativePair() internal returns (ForgeXToken token, ForgeXCurve curve) {
        curve = deployCurveProxy("");
        token = deployTokenProxy(tokenInitData(admin, address(curve)));
        curve.initialize(address(this), address(token), INITIAL_PRICE, STEEPNESS, RESERVE_TARGET, admin, address(0));
    }

    /// @notice Wraps an arbitrary implementation in a proxy with the given initializer
    ///         calldata. Kept separate so tests building several deployments at once do not
    ///         exhaust the EVM stack while assembling init code inline.
    function deployTokenProxy(bytes memory initData) internal returns (ForgeXToken) {
        return ForgeXToken(address(new ForgeXProxy(address(tokenImpl), initData)));
    }

    function deployCurveProxy(bytes memory initData) internal returns (ForgeXCurve) {
        return ForgeXCurve(address(new ForgeXProxy(address(curveImpl), initData)));
    }

    function tokenInitData(address admin_, address minter_) internal view returns (bytes memory) {
        return tokenInitDataNamed(admin_, minter_, "Test Token", "TEST");
    }

    function tokenInitDataNamed(address admin_, address minter_, string memory name_, string memory symbol_)
        internal
        view
        returns (bytes memory)
    {
        return abi.encodeCall(ForgeXToken.initialize, (address(this), admin_, minter_, name_, symbol_, 7, MAX_SUPPLY));
    }

    function curveInitData(address token_, address admin_, address quoteToken_)
        internal
        view
        returns (bytes memory)
    {
        return
            abi.encodeCall(
                ForgeXCurve.initialize, (address(this), token_, INITIAL_PRICE, STEEPNESS, RESERVE_TARGET, admin_, quoteToken_)
            );
    }

    function defaultParams() internal pure returns (IForgeXTypes.CreateTokenParams memory) {
        return IForgeXTypes.CreateTokenParams({
            name: "Test Token",
            symbol: "TEST",
            decimals: 7,
            max_supply: MAX_SUPPLY,
            image_uri: "",
            description: "",
            initial_price: 100,
            steepness: 1,
            reserve_target: 5_000_000_000_000
        });
    }
}
