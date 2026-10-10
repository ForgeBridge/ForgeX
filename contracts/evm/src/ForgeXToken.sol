// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.24;

import {IForgeXToken} from "./interfaces/IForgeXToken.sol";
import {IForgeXTransferHook} from "./interfaces/IForgeXTransferHook.sol";

/// @title ForgeXToken
/// @notice Arc port of `contracts/stellar/token` (SEP-41) as an upgradeable, proxy-backed
///         ERC20 with an admin safety surface.
/// @dev Deployed once as a shared implementation and cloned per token by the factory
///      (see `ForgeXProxy`). Storage is written only through the initializer, so the
///      layouts of this contract and any future implementation must stay append-only.
contract ForgeXToken is IForgeXToken {
    /// @dev ERC1967 implementation slot, see `ForgeXProxy`.
    bytes32 private constant _IMPLEMENTATION_SLOT = 0x360894a25aa1a5536bfd31c7a0a6a3d5b52f1cc86cd94b4d8cb1a1a5d1f8c9b1;

    /// @notice SEP-41 style error names, kept identical to the Soroban `TokenError` enum.
    error AlreadyInitializedError();
    error UnauthorizedError();
    error NegativeAmountError();
    error AllowanceError();
    error BalanceError();
    error InvalidMetadataError();
    error ContractPausedError();
    error HooksError();
    error MaxSupplyError();
    error NotFactory();
    error ImplementationHasNoCode();

    /// @notice SEP-41 `InterfaceVersion`, see `contracts/stellar/token/src/upgrade.rs`.
    uint32 internal constant _INTERFACE_VERSION = 1;
    uint32 internal constant _IMPLEMENTATION_VERSION = 3;
    uint256 internal constant _MAX_NAME_SYMBOL_LEN = 32;

    string private _name;
    string private _symbol;
    uint8 private _decimals;
    uint256 private _maxSupply;
    uint256 private _totalSupply;

    address private _admin;
    address private _minter;
    address private _factory;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    /// @dev A revoked address defaults back to false, so "authorized unless revoked"
    ///      matches the Soroban storage default of `true`.
    mapping(address => bool) private _revoked;

    bool private _paused;
    address private _transferHook;
    bool private _hookInFlight;

    bool private _initialized;
    uint32 private _interfaceVersion;
    uint32 private _implementationVersion;

    /// @dev Locks the shared implementation itself so nobody can initialize it and claim
    ///      ownership of the singleton. Proxies never see this constructor's storage.
    constructor() {
        _initialized = true;
    }

    /// @notice Called once by the factory, in the same transaction that creates the proxy.
    /// @dev Mirrors the Soroban flow of "deploy with no constructor, then initialize".
    function initialize(
        address factory_,
        address admin_,
        address minter_,
        string calldata name_,
        string calldata symbol_,
        uint8 decimals_,
        uint256 maxSupply_
    ) external {
        if (_initialized) revert AlreadyInitializedError();
        if (msg.sender != factory_) revert NotFactory();
        _validateMetadata(name_, symbol_, decimals_, maxSupply_);
        _initialized = true;
        _factory = factory_;
        _admin = admin_;
        _minter = minter_;
        _name = name_;
        _symbol = symbol_;
        _decimals = decimals_;
        _maxSupply = maxSupply_;
        _interfaceVersion = _INTERFACE_VERSION;
        _implementationVersion = _IMPLEMENTATION_VERSION;
    }

    function upgrade(address newImplementation) external {
        if (msg.sender != _admin) revert UnauthorizedError();
        if (newImplementation.code.length == 0) revert ImplementationHasNoCode();
        assembly {
            sstore(_IMPLEMENTATION_SLOT, newImplementation)
        }
        // Bump the implementation version so consumers can detect the change on-chain.
        ++_implementationVersion;
        emit Upgrade(msg.sender, newImplementation);
    }

    // ---------------------------------------------------------------- views

    function name() external view returns (string memory) {
        return _name;
    }

    function symbol() external view returns (string memory) {
        return _symbol;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function max_supply() external view returns (uint256) {
        return _maxSupply;
    }

    function admin() external view returns (address) {
        return _admin;
    }

    function minter() external view returns (address) {
        return _minter;
    }

    function factory() external view returns (address) {
        return _factory;
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address id) external view returns (uint256) {
        return _balances[id];
    }

    function allowance(address from, address spender) external view returns (uint256) {
        return _allowances[from][spender];
    }

    function authorized(address id) external view returns (bool) {
        return !_revoked[id];
    }

    function paused() external view returns (bool) {
        return _paused;
    }

    function transfer_hook() external view returns (address) {
        return _transferHook;
    }

    function version() external view returns (uint32 interfaceVersion, uint32 implementationVersion) {
        if (_interfaceVersion == 0) {
            return (_INTERFACE_VERSION, _IMPLEMENTATION_VERSION);
        }
        return (_interfaceVersion, _implementationVersion);
    }

    // ----------------------------------------------------------------- admin

    /// @notice Mints `amount` to `to`.
    /// @dev Soroban additionally requires `to` to authorize the mint, which needs a second
    ///      signature an EVM transaction cannot carry; the authorization requirement is
    ///      replaced by the minter role the factory grants the curve. As on Soroban, a
    ///      revoked address may still be minted to (it just cannot move the tokens).
    function mint(address to, uint256 amount) external returns (bool) {
        _requireNotPaused();
        if (msg.sender != _admin && msg.sender != _minter) revert UnauthorizedError();
        _mint(to, amount);
        return true;
    }

    /// @notice Burns `amount` from `from`.
    /// @dev Unlike `mint`, the holder does not have to authorize: this matches the
    ///      Soroban `burn`, which is admin gated only.
    function burn(address from, uint256 amount) external returns (bool) {
        _requireNotPaused();
        if (msg.sender != _admin && msg.sender != _minter) revert UnauthorizedError();
        _burn(from, amount);
        return true;
    }

    /// @notice SEP-41 `transfer(from, to, amount). Admin only rescue transfer.
    function admin_transfer(address from, address to, uint256 amount) external returns (bool) {
        _requireNotPaused();
        if (msg.sender != _admin) revert UnauthorizedError();
        if (_revoked[to]) revert UnauthorizedError();
        _runTransferHook(from, to, amount);
        _transfer(from, to, amount);
        emit AdminTransfer(msg.sender, from, to, amount);
        return true;
    }

    function set_admin(address newAdmin) external {
        if (msg.sender != _admin) revert UnauthorizedError();
        // The role must never be left drained, mirroring the Soroban authorization check.
        if (newAdmin == address(0) || _revoked[newAdmin]) revert UnauthorizedError();
        address previous = _admin;
        _admin = newAdmin;
        emit SetAdmin(previous, newAdmin);
    }

    function set_paused(bool isPaused) external {
        if (msg.sender != _admin) revert UnauthorizedError();
        _paused = isPaused;
        emit SetPaused(msg.sender, isPaused);
    }

    function set_authorized(address id, bool authorize) external {
        if (msg.sender != _admin) revert UnauthorizedError();
        if (id == _admin && !authorize) revert UnauthorizedError();
        _revoked[id] = !authorize;
        emit SetAuthorized(msg.sender, id, authorize);
    }

    function set_transfer_hook(address hook) external {
        if (msg.sender != _admin) revert UnauthorizedError();
        if (hook == address(this)) revert UnauthorizedError();
        _transferHook = hook;
        emit SetTransferHook(msg.sender, hook);
    }

    function set_minter(address minter_) external {
        if (msg.sender != _admin) revert UnauthorizedError();
        _minter = minter_;
        emit SetMinter(msg.sender, minter_);
    }

    // ------------------------------------------------------------- ERC20 core

    function transfer(address to, uint256 amount) external returns (bool) {
        _requireNotPaused();
        if (_revoked[msg.sender] || _revoked[to]) revert UnauthorizedError();
        _runTransferHook(msg.sender, to, amount);
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _requireNotPaused();
        if (_revoked[msg.sender]) revert UnauthorizedError();
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        _requireNotPaused();
        if (_revoked[from] || _revoked[to]) revert UnauthorizedError();
        // SEP-41 decrements the allowance as part of the transfer and refuses the whole
        // call when the allowance is short, rather than moving a partial amount.
        uint256 allowed = _allowances[from][msg.sender];
        if (allowed < amount) revert AllowanceError();
        if (allowed != type(uint256).max) {
            _allowances[from][msg.sender] = allowed - amount;
        }
        _runTransferHook(from, to, amount);
        _transfer(from, to, amount);
        return true;
    }

    // ------------------------------------------------------------- internals

    function _validateMetadata(string calldata name_, string calldata symbol_, uint8, uint256) internal pure {
        uint256 nameLength = bytes(name_).length;
        uint256 symbolLength = bytes(symbol_).length;
        if (nameLength == 0 || nameLength > _MAX_NAME_SYMBOL_LEN || symbolLength == 0
            || symbolLength > _MAX_NAME_SYMBOL_LEN) {
            revert InvalidMetadataError();
        }
    }

    function _requireNotPaused() private view {
        if (_paused) revert ContractPausedError();
    }

    function _mint(address to, uint256 amount) private {
        if (amount == 0) revert NegativeAmountError();
        uint256 newSupply = _totalSupply + amount;
        if (newSupply > _maxSupply) revert MaxSupplyError();
        _totalSupply = newSupply;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) private {
        if (amount == 0) revert NegativeAmountError();
        if (_balances[from] < amount) revert BalanceError();
        _balances[from] -= amount;
        unchecked {
            _totalSupply -= amount;
        }
        emit Transfer(from, address(0), amount);
    }

    function _transfer(address from, address to, uint256 amount) private {
        if (amount == 0) revert NegativeAmountError();
        if (_balances[from] < amount) revert BalanceError();
        _balances[from] -= amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
    }

    /// @dev Mirrors `try_run_transfer_hook`: refuses while a hook-driven transfer is on
    ///      the stack, fails closed on any hook error, and clears the flag either way.
    function _runTransferHook(address from, address to, uint256 amount) private {
        if (_hookInFlight) revert UnauthorizedError();
        address hook = _transferHook;
        if (hook == address(0)) return;
        _hookInFlight = true;
        try IForgeXTransferHook(hook).onTransfer(from, to, amount) {
            _hookInFlight = false;
        } catch {
            _hookInFlight = false;
            revert HooksError();
        }
    }
}
