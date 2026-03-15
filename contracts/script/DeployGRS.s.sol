// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {gSwapFactory} from "../src/gSwapFactory.sol";
import {MockGRS} from "../src/MockGRS.sol";
import {GRSStaking} from "../src/GRSStaking.sol";
import {IgPool} from "../src/interfaces/IgPool.sol";

/**
 * @title DeployGRS
 * @notice Deploy gSwap Platform Token (GRS) and GRS/USDT pool
 * @dev Also deploys the GRS staking contract
 */
contract DeployGRS is Script {
    
    // Deployed contract addresses (from previous deployment)
    address constant FACTORY = 0x90959F9Bf93EBE320d8aF0304Fd6aE87F0C7fD7c;
    address constant USDT = 0x375b3Ee0CfC16FaD04b2b8DF2fa48C3565320A5B;
    
    // Configuration
    uint256 constant INITIAL_GRS_SUPPLY = 10_000_000 * 10**18; // 10M GRS
    uint256 constant POOL_LIQUIDITY_GRS = 1_000_000 * 10**18;  // 1M GRS for pool
    uint256 constant POOL_LIQUIDITY_USDT = 1_000_000 * 10**6;  // 1M USDT for pool
    uint256 constant STAKING_REWARDS = 500_000 * 10**18;       // 500K GRS for staking rewards

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("========================================");
        console.log("gSwap GRS Token Deployment");
        console.log("========================================");
        console.log(string.concat("Deployer: ", vm.toString(deployer)));
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Step 1: Deploy GRS Token
        console.log("Step 1: Deploying GRS Token...");
        MockGRS grs = new MockGRS(INITIAL_GRS_SUPPLY);
        console.log(string.concat("GRS Token deployed at: ", vm.toString(address(grs))));
        console.log(string.concat("Initial supply: ", vm.toString(INITIAL_GRS_SUPPLY / 10**18), " GRS"));
        console.log("");
        
        // Step 2: Deploy GRS Staking Contract
        console.log("Step 2: Deploying GRS Staking Contract...");
        GRSStaking staking = new GRSStaking(address(grs));
        console.log(string.concat("GRS Staking deployed at: ", vm.toString(address(staking))));
        console.log("");
        
        // Step 3: Set staking contract in GRS token
        console.log("Step 3: Setting staking contract...");
        grs.setStakingContract(address(staking));
        console.log("Staking contract set successfully");
        console.log("");
        
        // Step 4: Fund staking contract with rewards
        console.log("Step 4: Funding staking rewards...");
        // Approve staking contract to pull rewards, then add rewards
        grs.approve(address(staking), STAKING_REWARDS);
        staking.addRewards(STAKING_REWARDS);
        console.log(string.concat("Added ", vm.toString(STAKING_REWARDS / 10**18), " GRS to reward pool"));
        console.log("");
        
        // Step 5: Create GRS/USDT Pool
        console.log("Step 5: Creating GRS/USDT pool...");
        gSwapFactory factory = gSwapFactory(FACTORY);
        address pool = factory.createPool(address(grs), USDT);
        console.log(string.concat("GRS/USDT Pool created at: ", vm.toString(pool)));
        console.log("");
        
        // Step 6: Add liquidity to the pool
        console.log("Step 6: Adding liquidity...");
        
        // Determine token order (factory sorts them)
        address token0 = USDT < address(grs) ? USDT : address(grs);
        address token1 = USDT < address(grs) ? address(grs) : USDT;
        
        // Approve tokens
        grs.approve(pool, POOL_LIQUIDITY_GRS);
        IERC20(USDT).approve(pool, POOL_LIQUIDITY_USDT);
        
        // Add liquidity in correct order
        if (token0 == USDT) {
            IgPool(pool).addLiquidity(POOL_LIQUIDITY_USDT, POOL_LIQUIDITY_GRS);
        } else {
            IgPool(pool).addLiquidity(POOL_LIQUIDITY_GRS, POOL_LIQUIDITY_USDT);
        }
        
        // Verify reserves
        (uint256 reserve0, uint256 reserve1, ) = IgPool(pool).getReserves();
        console.log(string.concat("Pool reserves: ", vm.toString(reserve0), " / ", vm.toString(reserve1)));
        console.log("");
        
        // Step 7: Mint additional GRS to deployer for distribution
        console.log("Step 7: Minting additional GRS for distribution...");
        grs.mint(deployer, 5_000_000 * 10**18); // 5M for faucets/airdrops
        console.log("Minted 5M GRS for distribution");
        
        vm.stopBroadcast();
        
        // Summary
        console.log("");
        console.log("========================================");
        console.log("Deployment Complete!");
        console.log("========================================");
        console.log(string.concat("GRS Token:     ", vm.toString(address(grs))));
        console.log(string.concat("GRS Staking:   ", vm.toString(address(staking))));
        console.log(string.concat("GRS/USDT Pool: ", vm.toString(pool)));
        console.log("");
        console.log("Token Details:");
        console.log(string.concat("  Name:     gSwap Token"));
        console.log(string.concat("  Symbol:   GRS"));
        console.log(string.concat("  Decimals: 18"));
        console.log("");
        console.log("Benefits for GRS Holders:");
        console.log("  - Fee Discounts: 5% (1K+), 10% (10K+), 25% (100K+)");
        console.log("  - Staking Rewards: 10% APR (20% with 30-day lock)");
        console.log("  - Airdrop Eligibility: 1,000+ GRS");
        console.log("");
    }
}

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
}
