// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {gSwapFactory} from "../src/gSwapFactory.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {IgPool} from "../src/interfaces/IgPool.sol";

contract gSwapTest is Test {
    gSwapFactory factory;
    MockERC20 tokenA;
    MockERC20 tokenB;
    
    address deployer = address(1);
    address user = address(2);
    
    function setUp() public {
        vm.startPrank(deployer);
        
        factory = new gSwapFactory();
        tokenA = new MockERC20("Token A", "TKA", 18, 0);
        tokenB = new MockERC20("Token B", "TKB", 18, 0);
        
        // Mint tokens
        tokenA.mint(deployer, 1_000_000 * 10**18);
        tokenB.mint(deployer, 1_000_000 * 10**18);
        
        vm.stopPrank();
    }
    
    function testFactoryDeployment() public {
        assertEq(factory.owner(), deployer);
        assertEq(factory.poolCount(), 0);
        assertEq(factory.swapFee(), 30);
    }
    
    function testCreatePool() public {
        vm.prank(deployer);
        address pool = factory.createPool(address(tokenA), address(tokenB));
        
        assertTrue(pool != address(0));
        assertEq(factory.poolCount(), 1);
        
        address retrievedPool = factory.getPool(
            address(tokenA) < address(tokenB) ? address(tokenA) : address(tokenB),
            address(tokenA) < address(tokenB) ? address(tokenB) : address(tokenA)
        );
        assertEq(retrievedPool, pool);
    }
    
    function testMockERC20Mint() public {
        uint256 mintAmount = 1000 * 10**18;
        
        vm.prank(user);
        tokenA.mint(user, mintAmount);
        
        assertEq(tokenA.balanceOf(user), mintAmount);
    }
    
    function testMockERC20Faucet() public {
        vm.prank(user);
        tokenA.faucet();
        
        assertEq(tokenA.balanceOf(user), 10000 * 10**18);
    }
    
    function testAddLiquidity() public {
        // Create pool
        vm.prank(deployer);
        address poolAddr = factory.createPool(address(tokenA), address(tokenB));
        IgPool pool = IgPool(poolAddr);
        
        uint256 amount0 = 100000 * 10**18;
        uint256 amount1 = 100000 * 10**18;
        
        vm.startPrank(deployer);
        tokenA.approve(poolAddr, amount0);
        tokenB.approve(poolAddr, amount1);
        
        uint256 lpTokens = pool.addLiquidity(amount0, amount1);
        vm.stopPrank();
        
        assertTrue(lpTokens > 0);
        
        (uint256 reserve0, uint256 reserve1,) = pool.getReserves();
        assertEq(reserve0, amount0);
        assertEq(reserve1, amount1);
    }
    
    function testSwap() public {
        // Setup pool with liquidity
        vm.prank(deployer);
        address poolAddr = factory.createPool(address(tokenA), address(tokenB));
        IgPool pool = IgPool(poolAddr);
        
        uint256 amount0 = 100000 * 10**18;
        uint256 amount1 = 100000 * 10**18;
        
        vm.startPrank(deployer);
        tokenA.approve(poolAddr, amount0);
        tokenB.approve(poolAddr, amount1);
        pool.addLiquidity(amount0, amount1);
        
        // Setup user for swap
        tokenA.mint(user, 1000 * 10**18);
        vm.stopPrank();
        
        uint256 swapAmount = 100 * 10**18;
        uint256 minOut = 1; // Accept any output for test
        
        vm.startPrank(user);
        tokenA.approve(poolAddr, swapAmount);
        
        uint256 output = pool.swap(
            address(tokenA),
            swapAmount,
            minOut,
            block.timestamp + 3600
        );
        vm.stopPrank();
        
        assertTrue(output > 0);
    }
}
