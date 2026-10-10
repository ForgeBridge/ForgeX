// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.24;

import {ForgeXProxy} from "./ForgeXProxy.sol";
import {ForgeXToken} from "./ForgeXToken.sol";
import {ForgeXCurve} from "./ForgeXCurve.sol";
import {IForgeXTypes} from "./interfaces/IForgeXTypes.sol";
import {IForgeXToken} from "./interfaces/IForgeXToken.sol";
import {IForgeXCurve} from "./interfaces/IForgeXCurve.sol";

/// @title ForgeXFactory
/// @notice Arc port of `contracts/stellar/factory`: a permissionless launchpad that deploys
///         a token and a bonding curve pair, initializes both, and registers them.
/// @dev Every forged token gets its own `ForgeXProxy` for the token and another for the
///      curve, both initialized inside the same transaction, so the factory never holds
///      custody of anything and the creator administers their own contracts from birth.
contract ForgeXFactory is IForgeXTypes {
    uint256 internal constant _MAX_NAME_SYMBOL_LEN = 32;
    uint256 internal constant _MAX_IMAGE_URI_LEN = 255;
    uint256 internal constant _MAX_DESCRIPTION_LEN = 1024;

    /// @notice Error names mirror the Soroban `ContractError` enum.
    error AlreadyInitialized();
    error Unauthorized();
    error InvalidMetadata();
    error InvalidCurveParams();
    error TokenExists();
    error TokenNotFound();
    error InvalidAdminAddress();
    error DeploymentFailed();

    /// @notice Factory-admin-configurable implementations, the EVM analogue of the WASM
    ///         hashes stored by the Soroban factory.
    address private _tokenImplementation;
    address private _curveImplementation;
    address private _admin;

    /// @notice Quote asset every new curve settles in: `address(0)` for the native Arc USDC
    ///         gas token, or an ERC20 USDC address.
    address private _quoteToken;

    /// @notice Registry, append only and always in creation order.
    TokenInfo[] private _tokens;

    /// @dev Name and symbol uniqueness. Soroban finds these by rescanning the whole
    ///      registry, which is fine off-chain but makes every `create_token` more expensive
    ///      than the last as the registry grows. These mappings keep the observable
    ///      behaviour (`has_name`, `token_exists`, listings) identical at bounded cost: the
    ///      one intentional storage difference in the port.
    mapping(bytes32 => address) private _tokenByName;
    mapping(bytes32 => address) private _tokenBySymbol;

    /// @dev Monotonic deployment counter, the analogue of the Soroban `deploy_nonce`.
    uint64 private _deployNonce;

    event TokenCreated(
        address indexed creator,
        address indexed token_id,
        address curve_id,
        string name,
        string symbol,
        uint8 decimals,
        uint256 max_supply,
        string image_uri,
        string description,
        uint64 created_at
    );
    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);
    event TokenImplementationChanged(address indexed admin, address implementation);
    event CurveImplementationChanged(address indexed admin, address implementation);
    event QuoteTokenSet(address indexed admin, address quoteToken);

    constructor(address admin_, address tokenImplementation_, address curveImplementation_) {
        _admin = admin_;
        _tokenImplementation = tokenImplementation_;
        _curveImplementation = curveImplementation_;
    }

    /// @notice Admin surface ---------------------------------------------------------------

    function get_admin() external view returns (address) {
        return _admin;
    }

    /// @notice Implementation used for future token deployments (Soroban `get_token_wasm`).
    function token_implementation() external view returns (address) {
        return _tokenImplementation;
    }

    /// @notice Implementation used for future curve deployments (Soroban `get_curve_wasm`).
    function curve_implementation() external view returns (address) {
        return _curveImplementation;
    }

    function quote_token() external view returns (address) {
        return _quoteToken;
    }

    function set_admin(address new_admin) external {
        _requireAdmin();
        // Soroban requires the new admin to exist in the ledger. An EOA must remain a legal
        // admin, so only the zero address is rejected here.
        if (new_admin == address(0)) revert InvalidAdminAddress();
        address previous = _admin;
        _admin = new_admin;
        emit AdminChanged(previous, new_admin);
    }

    function set_token_implementation(address implementation) external {
        _requireAdmin();
        if (implementation.code.length == 0) revert InvalidAdminAddress();
        _tokenImplementation = implementation;
        emit TokenImplementationChanged(msg.sender, implementation);
    }

    function set_curve_implementation(address implementation) external {
        _requireAdmin();
        if (implementation.code.length == 0) revert InvalidAdminAddress();
        _curveImplementation = implementation;
        emit CurveImplementationChanged(msg.sender, implementation);
    }

    function set_quote_token(address quoteToken) external {
        _requireAdmin();
        _quoteToken = quoteToken;
        emit QuoteTokenSet(msg.sender, quoteToken);
    }

    /// @notice Removes a token from the registry. Admin only.
    /// @dev Removal preserves the creation order of the remaining records, so pagination
    ///      ordering stays stable, and the name and symbol become reusable, exactly as on
    ///      Soroban where the registry is rescanned.
    function remove_token(address token_id) external {
        _requireAdmin();
        uint256 total = _tokens.length;
        for (uint256 i = 0; i < total; ++i) {
            if (_tokens[i].token_id != token_id) continue;
            _tokenByName[_nameKeyOf(_tokens[i])] = address(0);
            _tokenBySymbol[_symbolKeyOf(_tokens[i])] = address(0);
            for (uint256 j = i + 1; j < total; ++j) {
                _tokens[j - 1] = _tokens[j];
            }
            _tokens.pop();
            return;
        }
        revert TokenNotFound();
    }

    /// @notice Forging --------------------------------------------------------------------

    /// @notice Forges a token: deploys its token and curve proxies, initializes both, and
    ///         registers the pair. Permissionless: `msg.sender` is the creator and becomes
    ///         the admin of both contracts, so the factory admin has no forging privilege.
    /// @dev The Soroban entry point takes an explicit `creator` argument that it then
    ///      authorizes. On EVM `msg.sender` cannot be spoofed, so that argument is gone.
    function create_token(CreateTokenParams calldata params)
        external
        returns (address token_id, address curve_id)
    {
        _validate(params);

        bytes32 nameKey = _nameKey(params.name);
        bytes32 symbolKey = _symbolKey(params.symbol);
        if (_tokenByName[nameKey] != address(0) || _tokenBySymbol[symbolKey] != address(0)) {
            revert TokenExists();
        }

        uint64 nonce = _deployNonce;
        _deployNonce = nonce + 1;

        // The curve proxy is deployed first only to have its address available while the
        // token is initialized with the curve as its mint/burn authority. Neither
        // constructor takes any meaningful storage, so the order is not observable.
        curve_id = _deployProxy(_curveImplementation, "", _salt(nonce, 0x02));

        token_id = _deployProxy(_tokenImplementation, abi.encodeCall(IForgeXToken.initialize, (
            address(this),
            msg.sender,
            curve_id,
            params.name,
            params.symbol,
            params.decimals,
            params.max_supply
        )), _salt(nonce, 0x01));

        // The curve is initialized by the factory, which every forged curve allows.
        IForgeXCurve(curve_id)
            .initialize(address(this), token_id, params.initial_price, params.steepness, params.reserve_target, msg.sender, _quoteToken);

        _tokenByName[nameKey] = token_id;
        _tokenBySymbol[symbolKey] = token_id;

        TokenInfo memory info = TokenInfo({
            token_id: token_id,
            curve_id: curve_id,
            creator: msg.sender,
            name: params.name,
            symbol: params.symbol,
            decimals: params.decimals,
            max_supply: params.max_supply,
            image_uri: params.image_uri,
            description: params.description,
            created_at: uint64(block.timestamp)
        });
        _tokens.push(info);
        _emitTokenCreated(info);
    }

    /// @dev Emitted from a helper so the 10 fields of the registry record fit in stack
    ///      slots without needing `viaIR` for the whole factory.
    function _emitTokenCreated(TokenInfo memory info) private {
        emit TokenCreated(
            info.creator,
            info.token_id,
            info.curve_id,
            info.name,
            info.symbol,
            info.decimals,
            info.max_supply,
            info.image_uri,
            info.description,
            info.created_at
        );
    }

    /// @notice Reads --------------------------------------------------------------------

    function deploy_nonce() external view returns (uint64) {
        return _deployNonce;
    }

    function token_count() external view returns (uint256) {
        return _tokens.length;
    }

    function get_all_tokens() external view returns (TokenInfo[] memory) {
        return _tokens;
    }

    function has_token(address token_id) external view returns (bool) {
        for (uint256 i = 0; i < _tokens.length; ++i) {
            if (_tokens[i].token_id == token_id) {
                return true;
            }
        }
        return false;
    }

    function get_token(address token_id) external view returns (TokenInfo memory info) {
        for (uint256 i = 0; i < _tokens.length; ++i) {
            if (_tokens[i].token_id == token_id) {
                return _tokens[i];
            }
        }
        revert TokenNotFound();
    }

    function get_token_by_name(string calldata name) external view returns (address) {
        address found = _tokenByName[_nameKey(name)];
        if (found == address(0)) revert TokenNotFound();
        return found;
    }

    function get_token_by_symbol(string calldata symbol) external view returns (address) {
        address found = _tokenBySymbol[_symbolKey(symbol)];
        if (found == address(0)) revert TokenNotFound();
        return found;
    }

    function has_name(string calldata name) external view returns (bool) {
        return _tokenByName[_nameKey(name)] != address(0);
    }

    function has_symbol(string calldata symbol) external view returns (bool) {
        return _tokenBySymbol[_symbolKey(symbol)] != address(0);
    }

    /// @notice One page of the registry, always in creation order.
    /// @dev `offset` and `offset + limit` saturate at the registry size, so an out-of-range
    ///      window returns the available tail, matching the Soroban pagination.
    function get_tokens_paginated(uint64 offset, uint64 limit) external view returns (TokenInfo[] memory page) {
        uint256 total = _tokens.length;
        uint256 start = offset > total ? total : offset;
        uint256 end = offset + limit > total ? total : offset + limit;
        page = new TokenInfo[](end - start);
        for (uint256 i = start; i < end; ++i) {
            page[i - start] = _tokens[i];
        }
    }

    /// @notice Internals -----------------------------------------------------------------

    function _requireAdmin() private view {
        if (msg.sender != _admin) revert Unauthorized();
    }

    function _validate(CreateTokenParams calldata params) internal pure {
        uint256 nameLength = bytes(params.name).length;
        uint256 symbolLength = bytes(params.symbol).length;
        if (
            nameLength == 0 || nameLength > _MAX_NAME_SYMBOL_LEN || symbolLength == 0
                || symbolLength > _MAX_NAME_SYMBOL_LEN || bytes(params.image_uri).length > _MAX_IMAGE_URI_LEN
                || bytes(params.description).length > _MAX_DESCRIPTION_LEN
        ) {
            revert InvalidMetadata();
        }
        if (params.initial_price <= 0 || params.steepness <= 0 || params.reserve_target < 0) {
            revert InvalidCurveParams();
        }
    }

    /// @dev Same deterministic salt scheme as the Soroban factory: a u64 nonce in the first
    ///      eight bytes and a per-contract tag in the last byte.
    function _salt(uint64 nonce, uint8 tag) internal pure returns (bytes32) {
        return bytes32((uint256(nonce) << 192) | uint256(tag));
    }

    function _deployProxy(address implementation, bytes memory data, bytes32 salt)
        private
        returns (address proxy)
    {
        bytes memory initCode = abi.encodePacked(type(ForgeXProxy).creationCode, abi.encode(implementation, data));
        assembly {
            proxy := create2(0, add(initCode, 0x20), mload(initCode), salt)
        }
        if (proxy == address(0) || proxy.code.length == 0) revert DeploymentFailed();
    }

    function _nameKey(string calldata name) internal pure returns (bytes32) {
        return keccak256(bytes(name));
    }

    function _symbolKey(string calldata symbol) internal pure returns (bytes32) {
        return keccak256(bytes(symbol));
    }

    function _nameKeyOf(TokenInfo storage info) private view returns (bytes32) {
        return keccak256(bytes(info.name));
    }

    function _symbolKeyOf(TokenInfo storage info) private view returns (bytes32) {
        return keccak256(bytes(info.symbol));
    }
}
