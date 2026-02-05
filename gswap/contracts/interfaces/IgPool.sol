// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IgPool
 * @notice Interface for gSwap AMM pools (gPool)
 */
interface IgPool {
    /// @notice Token addresses
    function token0() external view returns (address);
    function token1() external view returns (address);
    
    /// @notice Current reserves
    function reserve0() external view returns (uint256);
    function reserve1() external view returns (uint256);
    
    /// @notice Swap fee (30 = 0.3%)
    function swapFee() external view returns (uint16);
    
    /// @notice Get reserves with timestamp
    function getReserves() external view returns (uint256, uint256, uint32);
    
    /// @notice Calculate output for given input
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) external view returns (uint256);
    
    /// @notice Swap tokens
    function swap(address tokenIn, uint256 amountIn, uint256 minAmountOut, uint256 deadline) external returns (uint256);
    
    /// @notice Add liquidity
    function addLiquidity(uint256 amount0, uint256 amount1) external returns (uint256 lpTokens);
    
    /// @notice Remove liquidity
    function removeLiquidity(uint256 lpTokens) external returns (uint256 amount0, uint256 amount1);
    
    /// @notice Initialize pool (called by factory)
    function initialize(address _token0, address _token1, uint16 _swapFee) external;
}
