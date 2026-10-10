// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {ForgeXFactory} from "../src/ForgeXFactory.sol";
import {ForgeXProxy} from "../src/ForgeXProxy.sol";
import {ForgeXToken} from "../src/ForgeXToken.sol";
import {ForgeXCurve} from "../src/ForgeXCurve.sol";
import {IForgeXTypes} from "../src/interfaces/IForgeXTypes.sol";

/// @title Deploy
/// @notice Deploys the ForgeX EVM suite to Arc and initializes the factory.
///
/// @dev Reads configuration from the environment so the same script serves testnet,
///      mainnet and a local node:
///
///        ARC_RPC_URL            RPC endpoint, e.g. https://rpc.testnet.arc.io
///        FACTORY_ADMIN          admin address (defaults to the deployer)
///        ARC_USDC               ERC20 quote address, or empty/0 for the native gas token
///        PRIVATE_KEY            deployer key (not needed when using --ledger)
///
///      The script writes the deployed addresses into `deployments/<label>.json`
///      so the frontend and the SDK can consume them, mirroring what
///      `scripts/deploy-testnet.sh` does for Soroban.
///
///      Run it with:
///        forge script script/Deploy.s.sol:Deploy --rpc-url $ARC_RPC_URL --broadcast
///
///      Add `--verify` (and FORGE_ETHERSCAN_API_KEY or the Arc explorer key) to
///      verify the sources after the fact.
contract Deploy is Script {
    struct Deployment {
        address factory;
        address tokenImplementation;
        address curveImplementation;
        address admin;
        address quoteToken;
        uint256 chainId;
    }

    function run() public returns (Deployment memory out) {
        uint256 deployerKey = vm.envOr("PRIVATE_KEY", uint256(0));
        address admin = vm.envOr("FACTORY_ADMIN", vm.addr(deployerKey));
        address quoteToken = vm.envOr("ARC_USDC", address(0));

        vm.startBroadcast(deployerKey);

        ForgeXToken tokenImplementation = new ForgeXToken();
        ForgeXCurve curveImplementation = new ForgeXCurve();
        ForgeXFactory factory = new ForgeXFactory(admin, address(tokenImplementation), address(curveImplementation));

        if (quoteToken != address(0)) {
            factory.set_quote_token(quoteToken);
        }

        vm.stopBroadcast();

        out = Deployment({
            factory: address(factory),
            tokenImplementation: address(tokenImplementation),
            curveImplementation: address(curveImplementation),
            admin: admin,
            quoteToken: quoteToken,
            chainId: block.chainid
        });

        console2.log("network            chainId", out.chainId);
        console2.log("factory            ", out.factory);
        console2.log("token implementation", out.tokenImplementation);
        console2.log("curve implementation", out.curveImplementation);
        console2.log("admin              ", out.admin);
        console2.log("quote token        ", out.quoteToken == address(0) ? "native USDC (gas token)" : vm.toString(out.quoteToken));

        // Persist the addresses next to the suite so the deploy script and the frontend
        // can pick them up without copy-pasting from the console output.
        string memory label = vm.envOr("ARC_DEPLOY_LABEL", string.concat("chain-", vm.toString(block.chainid)));
        string memory json = _deploymentJson(out);
        vm.writeJson(json, string.concat("deployments/", label, ".json"));

        console2.log("Wrote deployments/%s.json", label);
        console2.log("Point the frontend at it with NEXT_PUBLIC_ARC_FACTORY_ADDRESS=%s", vm.toString(out.factory));
    }

    /// @dev Local smoke deployment: one factory, one token, and a trade against a mock
    ///      quote. Useful for validating the scripts without touching a real network.
    function runLocalSmoke() public {
        vm.startBroadcast();
        MockQuote usdc = new MockQuote();
        ForgeXToken tokenImplementation = new ForgeXToken();
        ForgeXCurve curveImplementation = new ForgeXCurve();
        ForgeXFactory factory = new ForgeXFactory(address(this), address(tokenImplementation), address(curveImplementation));
        factory.set_quote_token(address(usdc));

        (address token, address curve) = factory.create_token(_params());
        vm.stopBroadcast();

        console2.log("smoke factory", address(factory));
        console2.log("smoke token", token);
        console2.log("smoke curve", curve);
    }

    function _params() internal pure returns (IForgeXTypes.CreateTokenParams memory) {
        return IForgeXTypes.CreateTokenParams({
            name: "ForgeX Demo",
            symbol: "FDEMO",
            decimals: 7,
            max_supply: 1_000_000_000_000_000,
            image_uri: "",
            description: "Smoke deployment",
            initial_price: 100,
            steepness: 1,
            reserve_target: 500_000_000_000
        });
    }

    function _deploymentJson(Deployment memory d) internal pure returns (string memory) {
        return string.concat(
            '{"chainId":',
            vm.toString(d.chainId),
            ',"factory":"',
            vm.toString(d.factory),
            '","tokenImplementation":"',
            vm.toString(d.tokenImplementation),
            '","curveImplementation":"',
            vm.toString(d.curveImplementation),
            '","admin":"',
            vm.toString(d.admin),
            '","quoteToken":"',
            vm.toString(d.quoteToken),
            '"}'
        );
    }
}

/// @notice Minimal USDC-shaped ERC20 for the local smoke run.
contract MockQuote {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _move(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(allowance[from][msg.sender] >= amount);
        _move(from, to, amount);
        return true;
    }

    function _move(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount);
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
    }
}
