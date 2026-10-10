// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.24;

/// @title ForgeXProxy
/// @notice Minimal ERC1967 proxy. One of these is deployed by `ForgeXFactory` for every
///         forged token and every forged curve, and the implementation they point at is
///         upgraded by `ForgeXToken.upgrade` / `ForgeXCurve.upgrade` (UUPS style), which
///         is the EVM equivalent of the Soroban `upgrade(new_wasm_hash)` entry point.
/// @dev This is a proxy, not a wallet controller. There is no proxy admin role: whoever
///      holds the token admin can upgrade that token's implementation, exactly like on
///      Soroban.
contract ForgeXProxy {
    /// @dev ERC1967 implementation slot: keccak256("eip1967.proxy.implementation") - 1.
    bytes32 private constant _IMPLEMENTATION_SLOT = 0x360894a25aa1a5536bfd31c7a0a6a3d5b52f1cc86cd94b4d8cb1a1a5d1f8c9b1;

    constructor(address implementation_, bytes memory data_) {
        require(implementation_.code.length > 0, "ForgeXProxy: no implementation");
        assembly {
            sstore(_IMPLEMENTATION_SLOT, implementation_)
        }
        if (data_.length > 0) {
            (bool ok, bytes memory returnData) = implementation_.delegatecall(data_);
            if (!ok) {
                if (returnData.length > 0) {
                    assembly {
                        revert(add(returnData, 0x20), mload(returnData))
                    }
                }
                revert("ForgeXProxy: initialization failed");
            }
        }
    }

    function implementation() external view returns (address impl) {
        assembly {
            impl := sload(_IMPLEMENTATION_SLOT)
        }
    }

    fallback() external payable virtual {
        _delegate();
    }

    function _delegate() private {
        address impl;
        assembly {
            impl := sload(_IMPLEMENTATION_SLOT)
        }
        require(impl.code.length > 0, "ForgeXProxy: no implementation");
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }
}
