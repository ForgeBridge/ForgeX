// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.24;

/// @title MockQuote
/// @notice Minimal ERC20 quote asset (USDC shaped: 6 decimals) for tests.
contract MockQuote {
    string public name = "USD Coin";
    string public symbol = "USDC";
    uint8 public constant decimals = 6;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _move(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "MockQuote: allowance");
            allowance[from][msg.sender] = allowed - amount;
        }
        _move(from, to, amount);
        return true;
    }

    function _move(address from, address to, uint256 amount) internal virtual {
        require(balanceOf[from] >= amount, "MockQuote: balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}

/// @notice Quote asset that re-enters the curve mid-transfer, used to prove the reentrancy
///         guard actually blocks re-entry rather than just being present.
contract ReentrantQuote is MockQuote {
    address public target;
    bytes public payload;
    bool public armed;
    uint256 public reentryAttempts;

    function arm(address target_, bytes memory payload_) external {
        target = target_;
        payload = payload_;
        armed = true;
    }

    function _move(address from, address to, uint256 amount) internal override {
        if (armed && to == target) {
            armed = false;
            reentryAttempts += 1;
            // Swallow the failure: the point of the test is that the curve's guard refuses
            // the nested call, so the outer call must still fail on its own.
            (bool ok,) = target.call(payload);
            ok;
        }
        super._move(from, to, amount);
    }
}

/// @notice Transfer hook that records its call and can re-enter the token.
contract MockTransferHook {
    bool public reentrant;
    address public token;
    address public from;
    address public to;
    uint256 public amount;
    uint256 public calls;

    function setReentrancy(bool enabled, address token_) external {
        reentrant = enabled;
        token = token_;
    }

    function onTransfer(address from_, address to_, uint256 amount_) external {
        from = from_;
        to = to_;
        amount = amount_;
        calls += 1;
        if (reentrant) {
            (bool ok,) = token.call(
                abi.encodeWithSignature("transfer(address,uint256)", to_, amount_)
            );
            ok;
        }
    }
}
