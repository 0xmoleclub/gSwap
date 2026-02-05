// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {gSwapFactory} from "../src/gSwapFactory.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {IgPool} from "../src/interfaces/IgPool.sol";

/**
 * @title DeployGSwap
 * @notice Full deployment script for gSwap DEX with 10 pools and MockERC20 tokens
 * @dev Run with: forge script script/DeployGSwap.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
 */
contract DeployGSwap is Script {
    
    // Configuration
    uint256 constant INITIAL_MINT = 1_000_000_000 * 10**18; // 1B tokens each
    uint256 constant LIQUIDITY_AMOUNT = 100_000_000 * 10**18; // 100M per side per pool
    
    // Token configurations: name, symbol, decimals
    struct TokenConfig {
        string name;
        string symbol;
        uint8 decimals;
    }
    
    TokenConfig[] tokenConfigs;
    
    function setUp() public {
        // Define 10 tokens for 10 pools
        tokenConfigs.push(TokenConfig("Alpha Token", "ALPHA", 18));
        tokenConfigs.push(TokenConfig("Beta Token", "BETA", 18));
        tokenConfigs.push(TokenConfig("Gamma Token", "GAMMA", 18));
        tokenConfigs.push(TokenConfig("Delta Token", "DELTA", 18));
        tokenConfigs.push(TokenConfig("Epsilon Token", "EPSILON", 18));
        tokenConfigs.push(TokenConfig("Zeta Token", "ZETA", 18));
        tokenConfigs.push(TokenConfig("Eta Token", "ETA", 18));
        tokenConfigs.push(TokenConfig("Theta Token", "THETA", 18));
        tokenConfigs.push(TokenConfig("Iota Token", "IOTA", 18));
        tokenConfigs.push(TokenConfig("Kappa Token", "KAPPA", 18));
        // 2 extra tokens for pairing variety
        tokenConfigs.push(TokenConfig("Lambda Stable", "LAMBDA", 6));  // USDC-like
        tokenConfigs.push(TokenConfig("Mu Token", "MU", 18));
    }
    
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("========================================");
        console.log("gSwap DEX Full Deployment");
        console.log("========================================");
        console.log(string.concat("Deployer: ", vm.toString(deployer)));
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Step 1: Deploy Factory
        console.log("Step 1: Deploying gSwapFactory...");
        gSwapFactory factory = new gSwapFactory();
        console.log(string.concat("Factory deployed at: ", vm.toString(address(factory))));
        console.log("");
        
        // Step 2: Deploy all MockERC20 tokens
        console.log("Step 2: Deploying MockERC20 tokens...");
        MockERC20[] memory tokens = new MockERC20[](tokenConfigs.length);
        
        for (uint i = 0; i < tokenConfigs.length; i++) {
            tokens[i] = new MockERC20(
                tokenConfigs[i].name,
                tokenConfigs[i].symbol,
                tokenConfigs[i].decimals,
                0 // No initial supply, we'll mint separately
            );
            console.log(string.concat("  Token ", vm.toString(i + 1), ": ", tokenConfigs[i].symbol, " at ", vm.toString(address(tokens[i]))));
        }
        console.log(string.concat("Total tokens deployed: ", vm.toString(tokenConfigs.length)));
        console.log("");
        
        // Step 3: Mint tokens to deployer
        console.log("Step 3: Minting tokens to deployer...");
        for (uint i = 0; i < tokens.length; i++) {
            tokens[i].mint(deployer, INITIAL_MINT);
            console.log(string.concat("  Minted ", vm.toString(INITIAL_MINT / 10**tokenConfigs[i].decimals), " ", tokenConfigs[i].symbol));
        }
        console.log("");
        
        // Step 4: Create 10 pools with different token pairs
        console.log("Step 4: Creating pools...");
        
        // Pool pairs (token indices)
        uint8[2][10] memory poolPairs = [
            [0, 1],   // ALPHA/BETA
            [2, 3],   // GAMMA/DELTA
            [4, 5],   // EPSILON/ZETA
            [6, 7],   // ETA/THETA
            [8, 9],   // IOTA/KAPPA
            [0, 10],  // ALPHA/LAMBDA (volatile/stable)
            [1, 10],  // BETA/LAMBDA
            [2, 11],  // GAMMA/MU
            [3, 11],  // DELTA/MU
            [10, 11]  // LAMBDA/MU (stable pair)
        ];
        
        address[10] memory poolAddresses;
        
        for (uint i = 0; i < 10; i++) {
            MockERC20 token0 = tokens[poolPairs[i][0]];
            MockERC20 token1 = tokens[poolPairs[i][1]];
            
            // Sort tokens for factory (factory requires token0 < token1)
            (address t0, address t1) = address(token0) < address(token1) 
                ? (address(token0), address(token1))
                : (address(token1), address(token0));
            
            address pool = factory.createPool(t0, t1);
            poolAddresses[i] = pool;
            
            console.log(string.concat("  Pool ", vm.toString(i + 1), ": ", vm.toString(pool)));
            
            string memory sym0 = tokenConfigs[poolPairs[i][0]].symbol;
            string memory sym1 = poolPairs[i][1] == 10 ? "LAMBDA" : 
                                 poolPairs[i][1] == 11 ? "MU" : 
                                 tokenConfigs[poolPairs[i][1]].symbol;
            console.log(string.concat("    Pair: ", sym0, "/", sym1));
        }
        console.log(string.concat("Total pools created: ", vm.toString(factory.poolCount())));
        console.log("");
        
        // Step 5: Approve and add liquidity to all pools
        console.log("Step 5: Adding liquidity to pools...");
        
        for (uint i = 0; i < 10; i++) {
            MockERC20 token0 = tokens[poolPairs[i][0]];
            MockERC20 token1 = tokens[poolPairs[i][1]];
            IgPool pool = IgPool(poolAddresses[i]);
            
            uint8 decimals0 = token0.decimals();
            uint8 decimals1 = token1.decimals();
            
            // Calculate amounts with proper decimals
            uint256 amount0 = LIQUIDITY_AMOUNT / (10**(18 - decimals0));
            uint256 amount1 = LIQUIDITY_AMOUNT / (10**(18 - decimals1));
            
            // Approve pool to pull tokens via transferFrom
            token0.approve(address(pool), amount0);
            token1.approve(address(pool), amount1);
            
            // Add liquidity - pool will pull tokens from us
            uint256 lpTokens = pool.addLiquidity(amount0, amount1);
            
            console.log(string.concat("  Pool ", vm.toString(i + 1), ": Added liquidity"));
            console.log(string.concat("    Token0: ", vm.toString(amount0 / 10**decimals0), " ", tokenConfigs[poolPairs[i][0]].symbol));
            console.log(string.concat("    Token1: ", vm.toString(amount1 / 10**decimals1), " ", i == 9 ? "MU" : tokenConfigs[poolPairs[i][1]].symbol));
            console.log(string.concat("    LP Tokens received: ", vm.toString(lpTokens / 10**18)));
        }
        console.log("");
        
        vm.stopBroadcast();
        
        // Summary
        console.log("========================================");
        console.log("Deployment Complete!");
        console.log("========================================");
        console.log(string.concat("Factory: ", vm.toString(address(factory))));
        console.log(string.concat("Total Pools: ", vm.toString(factory.poolCount())));
        console.log("");
        console.log("Token Addresses:");
        for (uint i = 0; i < tokens.length; i++) {
            console.log(string.concat("  ", tokenConfigs[i].symbol, ": ", vm.toString(address(tokens[i]))));
        }
        console.log("");
        console.log("Pool Addresses:");
        for (uint i = 0; i < 10; i++) {
            console.log(string.concat("  Pool ", vm.toString(i + 1), ": ", vm.toString(poolAddresses[i])));
        }
        console.log("");
        console.log("Next steps:");
        console.log("1. Update DEPLOY_BLOCK in .env with current block number");
        console.log("2. Configure Subsquid indexer with factory address");
        console.log("3. Start the agent");
    }
}

/**
 * @title DeployGSwapAnvil
 * @notice Simplified version for local Anvil testing
 * @dev Run with: forge script script/DeployGSwap.s.sol --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
 */
contract DeployGSwapAnvil is DeployGSwap {
    // Uses same logic but with Anvil defaults
    // Anvil default private key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
}
