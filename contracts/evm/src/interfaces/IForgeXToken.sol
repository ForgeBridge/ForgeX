// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.24;

/// @title IForgeXToken
/// @notice ForgeX token on Arc: SEP-41 semantics expressed as an ERC20-compatible surface.
///
/// @dev Naming convention, and why:
///      - `transfer`, `approve`, `transferFrom`, `balanceOf`, `allowance`, `name`,
///        `symbol`, `decimals` keep the canonical ERC20 signatures. This is deliberate:
///        Soroban's `transfer(from, to, amount)` and EVM's `transfer(to, amount)` share a
///        name but not a signature, so the SEP-41 shape is exposed as `admin_transfer`
///        instead of overloading `transfer` and silently breaking wallet tooling.
///      - Everything else keeps the Soroban entry-point names (`mint`, `burn`,
///        `admin_transfer`, `set_paused`, `set_authorized`, ...) so the TypeScript SDK can
///        address both chains with one method map.
interface IForgeXToken {
    /// @notice SEP-41 metadata read: name, symbol, decimals and max supply.
    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function decimals() external view returns (uint8);

    function max_supply() external view returns (uint256);

    /// @notice SEP-41 `metadata()` restricted to the admin and factory pointers.
    function admin() external view returns (address);

    function minter() external view returns (address);

    function factory() external view returns (address);

    function totalSupply() external view returns (uint256);

    function balanceOf(address id) external view returns (uint256);

    function allowance(address from, address spender) external view returns (uint256);

    function authorized(address id) external view returns (bool);

    function paused() external view returns (bool);

    function transfer_hook() external view returns (address);

    /// @notice SEP-41 `version()`: interface and implementation numbers.
    function version() external view returns (uint32 interfaceVersion, uint32 implementation);

    /// @notice ERC20 transfer. Soroban's `transfer` (three-argument form) is `admin_transfer`.
    function transfer(address to, uint256 amount) external returns (bool);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    /// @notice Mints `amount` to `to`. Admin or the registered curve (`minter`).
    function mint(address to, uint256 amount) external returns (bool);

    /// @notice Burns `amount` from `from`. Admin or the registered curve (`minter`).
    function burn(address from, uint256 amount) external returns (bool);

    /// @notice SEP-41 `transfer(from, to, amount)`. Admin only, no owner authorization.
    function admin_transfer(address from, address to, uint256 amount) external returns (bool);

    /// @notice Transfers the admin role. Soroban requires the new admin to exist.
    function set_admin(address new_admin) external;

    function set_paused(bool isPaused) external;

    function set_authorized(address id, bool authorize) external;

    /// @notice Installs or clears the transfer hook. The token cannot be its own hook.
    function set_transfer_hook(address hook) external;

    /// @notice Grants or revokes mint/burn rights (used by the bonding curve).
    function set_minter(address minter_) external;

    /// @notice Admin-gated ERC1967 implementation upgrade, mirroring Soroban's `upgrade`.
    function upgrade(address new_implementation) external;

    /// @notice One-time factory initializer, called from `ForgeXFactory.create_token`.
    function initialize(
        address factory_,
        address admin_,
        address minter_,
        string calldata name_,
        string calldata symbol_,
        uint8 decimals_,
        uint256 maxSupply_
    ) external;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event SetPaused(address indexed admin, bool paused);
    event SetTransferHook(address indexed admin, address hook);
    event SetAuthorized(address indexed admin, address indexed id, bool authorize);
    event SetAdmin(address indexed admin, address indexed newAdmin);
    event SetMinter(address indexed admin, address indexed minter_);
    event AdminTransfer(address indexed admin, address indexed from, address indexed to, uint256 amount);
    event Upgrade(address indexed admin, address indexed newImplementation);
}
