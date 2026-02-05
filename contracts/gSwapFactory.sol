// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./gPool.sol";
import "./interfaces/IgPool.sol";
import "./interfaces/IgSwapFactory.sol";

/**
 * @title gSwapFactory
 * @notice Factory for creating and tracking gSwap AMM pools (gPool)
 * @dev Uses CREATE2 for deterministic pool addresses
 */
contract gSwapFactory is IgSwapFactory {
    
    /// @notice Contract owner
    address public override owner;
    
    /// @notice All gPools created by this factory
    address[] public override allPools;
    
    /// @notice Pool lookup by token pair (sorted addresses)
    mapping(address => mapping(address => address)) public override getPool;
    
    /// @notice Fee tier for new pools (30 = 0.3%)
    uint16 public override swapFee = 30;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "gSwapFactory: NOT_OWNER");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }
    
    /// @notice Create a new gPool for token pair
    function createPool(address token0, address token1) external override returns (address pool) {
        require(token0 != token1, "gSwapFactory: SAME_TOKEN");
        require(token0 != address(0) && token1 != address(0), "gSwapFactory: ZERO_ADDRESS");
        
        // Sort tokens for consistent ordering
        (address _token0, address _token1) = token0 < token1 ? (token0, token1) : (token1, token0);
        
        require(getPool[_token0][_token1] == address(0), "gSwapFactory: POOL_EXISTS");
        
        // Deploy pool using CREATE2 for deterministic address
        bytes memory bytecode = type(gPool).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(_token0, _token1));
        
        assembly {
            pool := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        
        require(pool != address(0), "gSwapFactory: DEPLOY_FAILED");
        
        // Initialize pool
        IgPool(pool).initialize(_token0, _token1, swapFee);
        
        // Track pool
        getPool[_token0][_token1] = pool;
        allPools.push(pool);
        
        emit PoolCreated(pool, _token0, _token1, allPools.length - 1);
        
        return pool;
    }
    
    /// @notice Get all gPool addresses
    function getAllPools() external view override returns (address[] memory) {
        return allPools;
    }
    
    /// @notice Get total pool count
    function poolCount() external view override returns (uint256) {
        return allPools.length;
    }
    
    /// @notice Get pool info by index
    function getPoolAtIndex(uint256 index) external view override returns (address pool, address _token0, address _token1) {
        require(index < allPools.length, "gSwapFactory: INVALID_INDEX");
        pool = allPools[index];
        _token0 = IgPool(pool).token0();
        _token1 = IgPool(pool).token1();
    }
    
    /// @notice Update fee for new pools
    function setFee(uint16 newFee) external onlyOwner {
        require(newFee <= 1000, "gSwapFactory: FEE_TOO_HIGH"); // Max 10%
        swapFee = newFee;
        emit FeeChanged(newFee);
    }
    
    /// @notice Transfer ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "gSwapFactory: ZERO_ADDRESS");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
