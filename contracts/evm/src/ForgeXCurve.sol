// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.24;

import {IForgeXCurve} from "./interfaces/IForgeXCurve.sol";
import {IForgeXToken} from "./interfaces/IForgeXToken.sol";
import {BondingCurveMath} from "./libraries/BondingCurveMath.sol";
import {IForgeXTypes} from "./interfaces/IForgeXTypes.sol";

interface IERC20Minimal {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    function transfer(address to, uint256 amount) external returns (bool);
}

/// @title ForgeXCurve
/// @notice Arc port of `contracts/stellar/bonding-curve`. Deployed once as a shared
///         upgradeable implementation; `ForgeXFactory` clones it per token behind a
///         `ForgeXProxy`.
///
/// @dev Differences from the Soroban contract, all intentional:
///
///      1. The Soroban curve is a pure accounting layer: it never holds XLM. The caller
///         is expected to settle the payment and move the tokens. On Arc the curve is the
///         settlement point - it pulls the quote asset on `buy` and pays out on `sell`,
///         and it mints/burns the token directly. This is what makes an Arc deployment
///         end-to-end tradeable.
///
///      2. Soroban takes an explicit `buyer`/`seller` argument that it authorizes; EVM
///         uses `msg.sender`, which cannot be spoofed.
///
///      3. The quote asset is either the native Arc USDC (gas token, `address(0)`) or an
///         ERC20 USDC, chosen at initialization.
///
///      Curve math, fee basis points, slippage semantics, deadlines, limits, graduation
///      and the admin surface are unchanged from the Soroban implementation.
contract ForgeXCurve is IForgeXCurve {
    /// @dev ERC1967 implementation slot, see `ForgeXProxy`.
    bytes32 private constant _IMPLEMENTATION_SLOT = 0x360894a25aa1a5536bfd31c7a0a6a3d5b52f1cc86cd94b4d8cb1a1a5d1f8c9b1;

    int256 internal constant _SCALE = BondingCurveMath.SCALE;
    int256 internal constant _MAX_FEE_BPS = 10_000;

    /// @dev Soroban passes curve amounts as `i128`, so anything beyond `int128` range is
    ///      unrepresentable there. Carrying the same bound keeps the casts below sound.
    int256 internal constant _MAX_AMOUNT = type(int128).max;

    /// @notice Error names mirror the Soroban `CurveError` enum.
    error AlreadyInitializedError();
    error NotFactory();
    error UnauthorizedError();
    error InvalidBuyAmount();
    error InvalidSellAmount();
    /// @dev An amount that is not a valid curve quantity: outside the Soroban i128 range.
    error InvalidAmount();
    error SlippageExceeded();
    error InsufficientPayout();
    error DeadlineExpired();
    error InvalidFeeRate();
    error InvalidBuyLimits();
    error InvalidSellLimits();
    error InvalidCap();
    error BuyBelowMinimum();
    error BuyExceedsMaximum();
    error SellBelowMinimum();
    error SellExceedsMaximum();
    error CapExceeded();
    error NoFeesToWithdraw();
    error ReentrancyGuard();
    error ImplementationHasNoCode();
    error IncorrectPayment();
    error QuoteTransferFailed();
    error CurveInvariantBroken();
    error InvalidCurveParams();

    address private _admin;
    address private _token;
    address private _quoteToken;
    address private _factory;

    BondingCurveMath.Params private _params;

    int256 private _reserve;
    int256 private _tokensSold;
    int256 private _adminFees;
    int256 private _feeRate;
    int256 private _minBuy;
    int256 private _maxBuy;
    int256 private _minSell;
    int256 private _maxSell;
    int256 private _cap;
    bool private _graduated;
    bool private _inFlight;
    bool private _initialized;

    /// @dev Locks the shared implementation, see `ForgeXToken`.
    constructor() {
        _initialized = true;
    }

    function initialize(
        address factory_,
        address token_,
        int256 initialPrice,
        int256 steepness,
        int256 reserveTarget,
        address admin_,
        address quoteToken_
    ) external {
        if (_initialized) revert AlreadyInitializedError();
        if (msg.sender != factory_) revert NotFactory();
        // The factory validates these before deploying; re-check here because this is the
        // only way state can be written.
        if (initialPrice <= 0 || steepness <= 0 || reserveTarget < 0) revert InvalidCurveParams();
        _initialized = true;
        _factory = factory_;
        _token = token_;
        _params = BondingCurveMath.Params({
            initialPrice: initialPrice,
            steepness: steepness,
            reserveTarget: reserveTarget
        });
        _admin = admin_;
        _quoteToken = quoteToken_;
        _feeRate = 0;
        _minBuy = 0;
        _maxBuy = _MAX_AMOUNT;
        _minSell = 0;
        _maxSell = _MAX_AMOUNT;
        _cap = _MAX_AMOUNT;
    }

    // ---------------------------------------------------------------- trading

    /// @notice Buys `amount_out` tokens, minting them while charging `cost + fee`.
    /// @dev The payment is collected before the mint so a failing mint reverts the payment.
    function buy(uint256 amount_out, int256 max_cost, uint64 deadline)
        external
        payable
        returns (int256 owed)
    {
        if (block.timestamp > deadline) revert DeadlineExpired();
        _enter();

        if (amount_out == 0) revert InvalidBuyAmount();
        int256 amount = _checkedAmount(amount_out);
        if (amount < _minBuy) revert BuyBelowMinimum();
        if (amount > _maxBuy) revert BuyExceedsMaximum();

        int256 tokens_sold = _tokensSold;
        int256 new_tokens_sold = tokens_sold + amount;
        if (new_tokens_sold > _cap) revert CapExceeded();

        int256 cost = BondingCurveMath.buyCost(_params, tokens_sold, new_tokens_sold);
        int256 fee = BondingCurveMath.feeOf(cost, _feeRate);
        owed = cost + fee;

        if (owed > max_cost) revert SlippageExceeded();

        _reserve += cost;
        _tokensSold = new_tokens_sold;
        _adminFees += fee;
        if (new_tokens_sold >= _cap) {
            _graduated = true;
        }

        _collect(msg.sender, uint256(owed));
        IForgeXToken(_token).mint(msg.sender, uint256(amount));

        int256 new_price = BondingCurveMath.price(_params, _tokensSold);
        emit Buy(msg.sender, uint256(amount), cost, fee, new_price, _reserve, _adminFees);

        _exit();
    }

    /// @notice Sells `amount_in` tokens back into the curve, paying out `payout - fee`.
    function sell(uint256 amount_in, int256 min_payout, uint64 deadline) external payable returns (int256 net) {
        if (block.timestamp > deadline) revert DeadlineExpired();
        _enter();

        if (amount_in == 0) revert InvalidSellAmount();
        int256 amount = _checkedAmount(amount_in);
        if (amount < _minSell) revert SellBelowMinimum();
        if (amount > _maxSell) revert SellExceedsMaximum();

        int256 tokens_sold = _tokensSold;
        if (amount > tokens_sold) revert InvalidSellAmount();

        int256 sold_to = tokens_sold - amount;
        int256 payout = BondingCurveMath.sellPayout(_params, tokens_sold, sold_to);
        int256 fee = BondingCurveMath.feeOf(payout, _feeRate);
        // Checked subtraction: reverts like the Soroban `checked_sub` when a fee would
        // exceed the payout, which the bounded fee rate already prevents.
        net = payout - fee;

        if (net < min_payout) revert InsufficientPayout();

        _reserve -= payout;
        _tokensSold = sold_to;
        _adminFees += fee;

        // Burn before paying out so a reentrant payout can never double-count.
        IForgeXToken(_token).burn(msg.sender, uint256(amount));
        _pay(msg.sender, uint256(net));

        int256 new_price = BondingCurveMath.price(_params, _tokensSold);
        emit Sell(msg.sender, uint256(amount), payout, fee, new_price, _reserve, _adminFees);

        _exit();
    }

    /// @notice Claims accumulated admin fees and transfers them to `recipient`.
    /// @dev The curve holds exactly `_reserve + _adminFees` of the quote asset, so paying
    ///      out `_adminFees` leaves the reserve fully backed. For an ERC20 quote that
    ///      invariant is asserted before the transfer, so fees can never be paid out of
    ///      the reserve.
    function withdraw_fees(address recipient) external returns (int256 amount) {
        _requireAdmin();
        amount = _adminFees;
        if (amount <= 0) revert NoFeesToWithdraw();
        if (_quoteToken != address(0)) {
            uint256 held = _quoteBalance();
            if (held < uint256(_reserve + amount)) revert CurveInvariantBroken();
        }
        _adminFees = 0;
        _pay(recipient, uint256(amount));
        emit WithdrawFees(msg.sender, recipient, amount);
    }

    // ------------------------------------------------------------------ admin

    function set_fee_rate(int256 rate) external {
        _requireAdmin();
        if (rate < 0 || rate > _MAX_FEE_BPS) revert InvalidFeeRate();
        _feeRate = rate;
        emit SetFeeRate(msg.sender, rate);
    }

    function set_buy_limits(int256 min_buy, int256 max_buy) external {
        _requireAdmin();
        if (min_buy > max_buy) revert InvalidBuyLimits();
        _minBuy = min_buy;
        _maxBuy = max_buy;
        emit SetBuyLimits(msg.sender, min_buy, max_buy);
    }

    function set_sell_limits(int256 min_sell, int256 max_sell) external {
        _requireAdmin();
        if (min_sell > max_sell) revert InvalidSellLimits();
        _minSell = min_sell;
        _maxSell = max_sell;
        emit SetSellLimits(msg.sender, min_sell, max_sell);
    }

    function set_cap(int256 cap) external {
        _requireAdmin();
        if (cap < _tokensSold) revert InvalidCap();
        _cap = cap;
        emit SetCap(msg.sender, cap);
    }

    /// @notice Admin-gated ERC1967 implementation upgrade.
    function upgrade(address newImplementation) external {
        _requireAdmin();
        if (newImplementation.code.length == 0) revert ImplementationHasNoCode();
        assembly {
            sstore(_IMPLEMENTATION_SLOT, newImplementation)
        }
        emit Upgrade(msg.sender, newImplementation);
    }

    // ------------------------------------------------------------- read-only

    function get_price() external view returns (int256) {
        return BondingCurveMath.price(_params, _tokensSold);
    }

    /// @dev Identical to `get_price`: the exponential curve is continuous and reversible.
    function get_buy_price() external view returns (int256) {
        return BondingCurveMath.price(_params, _tokensSold);
    }

    function get_sell_price() external view returns (int256) {
        return BondingCurveMath.price(_params, _tokensSold);
    }

    function get_reserve() external view returns (int256) {
        return _reserve;
    }

    function get_tokens_sold() external view returns (int256) {
        return _tokensSold;
    }

    function get_market_cap() external view returns (int256) {
        return BondingCurveMath.marketCap(BondingCurveMath.price(_params, _tokensSold), _tokensSold);
    }

    function get_admin_fees() external view returns (int256) {
        return _adminFees;
    }

    /// @notice Full state snapshot. Soroban returns a `CurveInfo` contracttype with a nested
    ///         `params`; the nested struct is flattened here into three fields so the ABI is
    ///         a single tuple callers can decode without knowing library types.
    function get_curve_info() external view returns (IForgeXTypes.CurveInfo memory info) {
        info.token_id = _token;
        info.initial_price = _params.initialPrice;
        info.steepness = _params.steepness;
        info.reserve_target = _params.reserveTarget;
        info.reserve = _reserve;
        info.tokens_sold = _tokensSold;
        info.price = BondingCurveMath.price(_params, _tokensSold);
        info.market_cap = BondingCurveMath.marketCap(info.price, _tokensSold);
        info.admin = _admin;
        info.fee_rate = _feeRate;
        info.cap = _cap;
        info.graduated = _graduated;
        info.admin_fees = _adminFees;
    }

    function get_curve_params()
        external
        view
        returns (int256 initialPrice, int256 steepness, int256 reserveTarget)
    {
        return (_params.initialPrice, _params.steepness, _params.reserveTarget);
    }

    function get_fee_rate() external view returns (int256) {
        return _feeRate;
    }

    function get_buy_limits() external view returns (int256 min_buy, int256 max_buy) {
        return (_minBuy, _maxBuy);
    }

    function get_sell_limits() external view returns (int256 min_sell, int256 max_sell) {
        return (_minSell, _maxSell);
    }

    function get_cap() external view returns (int256) {
        return _cap;
    }

    /// @notice Quote for buying `amount_out` tokens from the current supply: the amount the
    ///         buyer will owe, fees included. The frontend needs this before it can attach
    ///         the exact payment, and the tests use it to fund native-quote buys.
    function quote_buy(uint256 amount_out) external view returns (int256 owed) {
        int256 amount = _checkedAmount(amount_out);
        int256 newTokensSold = _tokensSold + amount;
        int256 cost = BondingCurveMath.buyCost(_params, _tokensSold, newTokensSold);
        owed = cost + BondingCurveMath.feeOf(cost, _feeRate);
    }

    /// @notice Quote for selling `amount_in` tokens: the net proceeds, fees deducted.
    function quote_sell(uint256 amount_in) external view returns (int256 net) {
        int256 amount = _checkedAmount(amount_in);
        int256 soldTo = _tokensSold - amount;
        int256 payout = BondingCurveMath.sellPayout(_params, _tokensSold, soldTo);
        net = payout - BondingCurveMath.feeOf(payout, _feeRate);
    }

    function is_graduated() external view returns (bool) {
        return _graduated;
    }

    function get_reserve_ratio() external view returns (int256) {
        int256 market_cap = BondingCurveMath.marketCap(BondingCurveMath.price(_params, _tokensSold), _tokensSold);
        if (market_cap == 0) {
            return 0;
        }
        return (_reserve * _SCALE) / market_cap;
    }

    function admin() external view returns (address) {
        return _admin;
    }

    function token() external view returns (address) {
        return _token;
    }

    function quote_token() external view returns (address) {
        return _quoteToken;
    }

    function factory() external view returns (address) {
        return _factory;
    }

    // -------------------------------------------------------------- internals

    function _requireAdmin() private view {
        if (msg.sender != _admin) revert UnauthorizedError();
    }

    /// @dev Rejects anything outside the Soroban `i128` amount range so the `int256`
    ///      comparisons below can never wrap. Zero is rejected by the caller so it can name
    ///      the buy or sell variant, matching the Soroban panics.
    function _checkedAmount(uint256 amount) private pure returns (int256) {
        if (amount > uint256(_MAX_AMOUNT)) revert InvalidAmount();
        return int256(amount);
    }

    /// @dev Port of the Soroban `enter`/`exit` reentrancy guard. The flag stays raised for
    ///      the whole liquidity operation, including the token mint/burn and the payout.
    function _enter() private {
        if (_inFlight) revert ReentrancyGuard();
        _inFlight = true;
    }

    function _exit() private {
        _inFlight = false;
    }

    function _collect(address from, uint256 amount) private {
        if (amount == 0) {
            return;
        }
        if (_quoteToken == address(0)) {
            if (msg.value != amount) revert IncorrectPayment();
        } else {
            if (msg.value != 0) revert IncorrectPayment();
            (bool ok, bytes memory returnData) = _quoteToken.call(
                abi.encodeCall(IERC20Minimal.transferFrom, (from, address(this), amount))
            );
            _requireOk(ok, returnData);
        }
    }

    function _pay(address to, uint256 amount) private {
        if (amount == 0) {
            return;
        }
        if (_quoteToken == address(0)) {
            (bool ok,) = to.call{value: amount}("");
            if (!ok) revert QuoteTransferFailed();
        } else {
            (bool ok, bytes memory returnData) = _quoteToken.call(
                abi.encodeCall(IERC20Minimal.transfer, (to, amount))
            );
            _requireOk(ok, returnData);
        }
    }

    /// @dev USDC-style ERC20s return a bool but some revert instead of returning false, so
    ///      accept both shapes and fail closed on anything else.
    function _requireOk(bool ok, bytes memory returnData) private pure {
        if (ok && (returnData.length == 0 || (returnData.length == 32 && abi.decode(returnData, (bool))))) {
            return;
        }
        revert QuoteTransferFailed();
    }

    function _quoteBalance() private view returns (uint256) {
        (bool ok, bytes memory returnData) = _quoteToken.staticcall(abi.encodeWithSignature("balanceOf(address)", address(this)));
        if (!ok || returnData.length < 32) return 0;
        return abi.decode(returnData, (uint256));
    }
}
