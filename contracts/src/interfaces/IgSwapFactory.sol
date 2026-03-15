// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IgSwapFactory
 * @notice Interface for gSwap factory
 */
interface IgSwapFactory {
    /// @notice Owner of the factory
    function owner() external view returns (address);
    
    /// @notice Current swap fee for new pools
    function swapFee() external view returns (uint16);
    
    /// @notice Get pool by token pair (ordered)
    function getPool(address token0, address token1) external view returns (address);
    
    /// @notice Get pool at index
    function allPools(uint256 index) external view returns (address);
    
    /// @notice Total number of pools
    function poolCount() external view returns (uint256);
    
    /// @notice Create new gPool
    function createPool(address token0, address token1) external returns (address pool);
    
    /// @notice Get all pools
    function getAllPools() external view returns (address[] memory);
    
    /// @notice Get pool info by index
    function getPoolAtIndex(uint256 index) external view returns (address pool, address token0, address token1);
    
    /// @notice Events
    event PoolCreated(address indexed pool, address indexed token0, address indexed token1, uint256 poolIndex);
    event FeeChanged(uint16 newFee);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
}
