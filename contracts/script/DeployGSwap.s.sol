// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {gSwapFactory} from "../src/gSwapFactory.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {IgPool} from "../src/interfaces/IgPool.sol";

/**
 * @title DeployGSwap
 * @notice Full deployment script for gSwap DEX with hub-and-spoke topology
 * @dev Creates realistic DEX with stablecoin hubs (USDC, USDT, DAI) as central pairs
 * @dev Run with: forge script script/DeployGSwap.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
 */
contract DeployGSwap is Script {
    
    // Configuration
    uint256 constant INITIAL_MINT_VOLATILE = 10_000_000_000 * 10**18; // 10B tokens (18 decimals)
    uint256 constant INITIAL_MINT_STABLE = 10_000_000_000 * 10**6;    // 10B tokens (6 decimals)
    
    // Stablecoin hub liquidity (deeper liquidity for hubs)
    uint256 constant HUB_LIQUIDITY = 50_000_000 * 10**18;  // 50M for volatile side
    uint256 constant STABLE_LIQUIDITY = 50_000_000 * 10**6; // 50M for stable side
    
    // Regular pool liquidity
    uint256 constant POOL_LIQUIDITY_VOLATILE = 10_000_000 * 10**18;  // 10M
    uint256 constant POOL_LIQUIDITY_STABLE = 10_000_000 * 10**6;     // 10M
    
    // Token categories
    struct TokenConfig {
        string name;
        string symbol;
        uint8 decimals;
        bool isStable;  // true for USDC/USDT/DAI hubs
    }
    
    TokenConfig[] tokenConfigs;
    
    function setUp() public {
        // ========== STABLECOIN HUBS (6 decimals) ==========
        tokenConfigs.push(TokenConfig("USD Circle", "USDC", 6, true));
        tokenConfigs.push(TokenConfig("USD Tether", "USDT", 6, true));
        tokenConfigs.push(TokenConfig("Dai Stablecoin", "DAI", 18, true)); // DAI is 18 decimals
        
        // ========== VOLATILE TOKENS (18 decimals) ==========
        // Major cryptos
        tokenConfigs.push(TokenConfig("Wrapped Ether", "WETH", 18, false));
        tokenConfigs.push(TokenConfig("Wrapped Bitcoin", "WBTC", 8, false));
        
        // Altcoins
        tokenConfigs.push(TokenConfig("ChainLink Token", "LINK", 18, false));
        tokenConfigs.push(TokenConfig("Uniswap Token", "UNI", 18, false));
        tokenConfigs.push(TokenConfig("Aave Token", "AAVE", 18, false));
        tokenConfigs.push(TokenConfig("Compound Token", "COMP", 18, false));
        tokenConfigs.push(TokenConfig("Maker Token", "MKR", 18, false));
        
        // Meme/community tokens
        tokenConfigs.push(TokenConfig("Shiba Inu", "SHIB", 18, false));
        tokenConfigs.push(TokenConfig("Pepe Token", "PEPE", 18, false));
        
        // Additional altcoins
        tokenConfigs.push(TokenConfig("Sushi Token", "SUSHI", 18, false));
        tokenConfigs.push(TokenConfig("Curve DAO", "CRV", 18, false));
        tokenConfigs.push(TokenConfig("Lido DAO", "LDO", 18, false));
    }
    
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("========================================");
        console.log("gSwap DEX - Hub & Spoke Deployment");
        console.log("========================================");
        console.log(string.concat("Deployer: ", vm.toString(deployer)));
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Step 1: Deploy Factory
        console.log("Step 1: Deploying gSwapFactory...");
        gSwapFactory factory = new gSwapFactory();
        console.log(string.concat("Factory deployed at: ", vm.toString(address(factory))));
        console.log("");
        
        // Step 2: Deploy all tokens
        console.log("Step 2: Deploying tokens...");
        uint256 numTokens = tokenConfigs.length;
        MockERC20[] memory tokens = new MockERC20[](numTokens);
        
        for (uint i = 0; i < numTokens; i++) {
            tokens[i] = new MockERC20(
                tokenConfigs[i].name,
                tokenConfigs[i].symbol,
                tokenConfigs[i].decimals,
                0
            );
            string memory tokenType = tokenConfigs[i].isStable ? "[STABLE]" : "[VOLATILE]";
            console.log(string.concat("  ", tokenType, " ", tokenConfigs[i].symbol, " at ", vm.toString(address(tokens[i]))));
        }
        console.log(string.concat("Total tokens: ", vm.toString(numTokens)));
        console.log("");
        
        // Step 3: Mint tokens to deployer
        console.log("Step 3: Minting tokens...");
        for (uint i = 0; i < numTokens; i++) {
            if (tokenConfigs[i].isStable && tokenConfigs[i].decimals == 6) {
                tokens[i].mint(deployer, INITIAL_MINT_STABLE);
            } else {
                tokens[i].mint(deployer, INITIAL_MINT_VOLATILE);
            }
        }
        console.log("Minted 10B of each token");
        console.log("");
        
        // Store indices for easy reference
        uint usdcIdx = 0;
        uint usdtIdx = 1;
        uint daiIdx = 2;
        
        // Step 4: Create pools with hub-and-spoke topology
        console.log("Step 4: Creating pools (Hub & Spoke topology)...");
        console.log("");
        
        address[] memory poolAddresses = new address[](20); // Max 20 pools
        uint poolCount = 0;
        
        // ========== TIER 1: STABLECOIN HUBS (Deep Liquidity) ==========
        console.log("--- Tier 1: Stablecoin Hubs ---");
        
        // WETH pairs (the most important)
        poolAddresses[poolCount++] = _createPool(factory, tokens[3], tokens[usdcIdx]); // WETH/USDC
        poolAddresses[poolCount++] = _createPool(factory, tokens[3], tokens[usdtIdx]); // WETH/USDT
        poolAddresses[poolCount++] = _createPool(factory, tokens[3], tokens[daiIdx]);  // WETH/DAI
        console.log("  WETH/USDC, WETH/USDT, WETH/DAI");
        
        // WBTC pairs
        poolAddresses[poolCount++] = _createPool(factory, tokens[4], tokens[usdcIdx]); // WBTC/USDC
        poolAddresses[poolCount++] = _createPool(factory, tokens[4], tokens[usdtIdx]); // WBTC/USDT
        console.log("  WBTC/USDC, WBTC/USDT");
        
        // ========== TIER 2: MAJOR ALTCOINS -> STABLECOINS ==========
        console.log("--- Tier 2: Major Altcoins -> Stablecoins ---");
        
        // LINK pairs
        poolAddresses[poolCount++] = _createPool(factory, tokens[5], tokens[usdcIdx]); // LINK/USDC
        poolAddresses[poolCount++] = _createPool(factory, tokens[5], tokens[usdtIdx]); // LINK/USDT
        console.log("  LINK/USDC, LINK/USDT");
        
        // UNI pairs
        poolAddresses[poolCount++] = _createPool(factory, tokens[6], tokens[usdcIdx]); // UNI/USDC
        console.log("  UNI/USDC");
        
        // AAVE pairs
        poolAddresses[poolCount++] = _createPool(factory, tokens[7], tokens[usdcIdx]); // AAVE/USDC
        console.log("  AAVE/USDC");
        
        // ========== TIER 3: STABLECOIN-STABLECOIN (Arbitrage Routes) ==========
        console.log("--- Tier 3: Stablecoin Pairs ---");
        
        poolAddresses[poolCount++] = _createPool(factory, tokens[usdcIdx], tokens[usdtIdx]); // USDC/USDT
        poolAddresses[poolCount++] = _createPool(factory, tokens[usdcIdx], tokens[daiIdx]);  // USDC/DAI
        poolAddresses[poolCount++] = _createPool(factory, tokens[usdtIdx], tokens[daiIdx]);  // USDT/DAI
        console.log("  USDC/USDT, USDC/DAI, USDT/DAI");
        
        // ========== TIER 4: MINOR ALTCOINS -> USDC ONLY ==========
        console.log("--- Tier 4: Minor Altcoins -> USDC ---");
        
        poolAddresses[poolCount++] = _createPool(factory, tokens[8], tokens[usdcIdx]);  // COMP/USDC
        poolAddresses[poolCount++] = _createPool(factory, tokens[9], tokens[usdcIdx]);  // MKR/USDC
        poolAddresses[poolCount++] = _createPool(factory, tokens[10], tokens[usdcIdx]); // SHIB/USDC
        poolAddresses[poolCount++] = _createPool(factory, tokens[11], tokens[usdcIdx]); // PEPE/USDC
        console.log("  COMP/USDC, MKR/USDC, SHIB/USDC, PEPE/USDC");
        
        // ========== TIER 5: DIRECT VOLATILE PAIRS (For direct arbitrage) ==========
        console.log("--- Tier 5: Direct Volatile Pairs ---");
        
        poolAddresses[poolCount++] = _createPool(factory, tokens[3], tokens[4]);   // WETH/WBTC
        poolAddresses[poolCount++] = _createPool(factory, tokens[5], tokens[6]);   // LINK/UNI
        poolAddresses[poolCount++] = _createPool(factory, tokens[12], tokens[13]); // SUSHI/CRV
        console.log("  WETH/WBTC, LINK/UNI, SUSHI/CRV");
        
        console.log("");
        console.log(string.concat("Total pools created: ", vm.toString(poolCount)));
        console.log("");
        
        // Step 5: Add liquidity
        console.log("Step 5: Adding liquidity...");
        
        for (uint i = 0; i < poolCount; i++) {
            IgPool pool = IgPool(poolAddresses[i]);
            MockERC20 token0 = MockERC20(pool.token0());
            MockERC20 token1 = MockERC20(pool.token1());
            
            uint8 decimals0 = token0.decimals();
            uint8 decimals1 = token1.decimals();
            
            uint256 amount0;
            uint256 amount1;
            
            // Determine liquidity amounts based on pool type
            bool isHubPair = (token0.decimals() == 6 || token1.decimals() == 6) && 
                             !(decimals0 == 6 && decimals1 == 6);
            
            if (isHubPair) {
                // Hub pairs get deeper liquidity
                amount0 = decimals0 == 6 ? STABLE_LIQUIDITY : HUB_LIQUIDITY;
                amount1 = decimals1 == 6 ? STABLE_LIQUIDITY : HUB_LIQUIDITY;
            } else {
                // Regular pairs
                amount0 = decimals0 == 6 ? POOL_LIQUIDITY_STABLE : POOL_LIQUIDITY_VOLATILE;
                amount1 = decimals1 == 6 ? POOL_LIQUIDITY_STABLE : POOL_LIQUIDITY_VOLATILE;
            }
            
            // Adjust for actual decimals
            if (decimals0 == 8) amount0 = 100_000_000 * 10**8; // WBTC special
            if (decimals1 == 8) amount1 = 100_000_000 * 10**8;
            
            token0.approve(address(pool), amount0);
            token1.approve(address(pool), amount1);
            
            console.log(string.concat("  Pool ", vm.toString(i + 1), ": ", token0.symbol(), "/", token1.symbol()));
        }
        
        vm.stopBroadcast();
        
        // Summary
        console.log("");
        console.log("========================================");
        console.log("Deployment Complete!");
        console.log("========================================");
        console.log(string.concat("Factory: ", vm.toString(address(factory))));
        console.log(string.concat("Total Pools: ", vm.toString(poolCount)));
        console.log("");
    }
    
    function _createPool(gSwapFactory factory, MockERC20 tokenA, MockERC20 tokenB) internal returns (address) {
        address t0 = address(tokenA);
        address t1 = address(tokenB);
        
        // Sort for factory
        if (t0 > t1) (t0, t1) = (t1, t0);
        
        return factory.createPool(t0, t1);
    }
}
