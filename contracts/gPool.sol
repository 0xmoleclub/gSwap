// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IgPool.sol";

/**
 * @title gPool
 * @notice gSwap AMM Pool - Minimal x*y=k implementation
 * @dev Created by gSwapFactory, supports swap/add/remove liquidity
 */
contract gPool is IgPool {
    
    /// @notice Factory that created this pool
    address public immutable factory;
    
    /// @notice Token addresses (sorted)
    address public override token0;
    address public override token1;
    
    /// @notice Current reserves
    uint256 public override reserve0;
    uint256 public override reserve1;
    
    /// @notice Swap fee (30 = 0.3%)
    uint16 public override swapFee;
    
    /// @notice Block timestamp of last reserve update
    uint32 public blockTimestampLast;
    
    /// @notice Reentrancy lock
    bool private locked;
    
    /// @notice Total gLP (gSwap LP) tokens
    uint256 public totalSupply;
    
    /// @notice gLP token balances
    mapping(address => uint256) public balanceOf;
    
    /// @notice Events
    event Swap(
        address indexed sender,
        uint256 amountIn,
        uint256 amountOut,
        address indexed tokenIn,
        address indexed tokenOut
    );
    
    event Mint(address indexed sender, uint256 amount0, uint256 amount1, uint256 lpTokens);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, uint256 lpTokens);
    event Sync(uint256 reserve0, uint256 reserve1);
    
    modifier lock() {
        require(!locked, "gPool: REENTRANT");
        locked = true;
        _;
        locked = false;
    }
    
    modifier onlyFactory() {
        require(msg.sender == factory, "gPool: NOT_FACTORY");
        _;
    }
    
    constructor() {
        factory = msg.sender;
    }
    
    /// @notice Initialize pool - called by factory once
    function initialize(address _token0, address _token1, uint16 _swapFee) external override onlyFactory {
        token0 = _token0;
        token1 = _token1;
        swapFee = _swapFee;
    }
    
    /// @notice Get current reserves and timestamp
    function getReserves() public view override returns (uint256, uint256, uint32) {
        return (reserve0, reserve1, blockTimestampLast);
    }
    
    /// @notice Calculate output amount for swap (with fee)
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public view override returns (uint256 amountOut) {
        require(amountIn > 0, "gPool: INSUFFICIENT_INPUT");
        require(reserveIn > 0 && reserveOut > 0, "gPool: INSUFFICIENT_LIQUIDITY");
        
        uint256 amountInWithFee = amountIn * (10000 - swapFee);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 10000) + amountInWithFee;
        amountOut = numerator / denominator;
    }
    
    /// @notice Add liquidity, mint gLP tokens proportionally
    function addLiquidity(uint256 amount0, uint256 amount1) external override lock returns (uint256 lpTokens) {
        require(amount0 > 0 && amount1 > 0, "gPool: ZERO_AMOUNT");
        
        // Pull tokens from sender
        _transferFrom(token0, msg.sender, amount0);
        _transferFrom(token1, msg.sender, amount1);
        
        // Calculate gLP tokens to mint
        if (totalSupply == 0) {
            // First liquidity: geometric mean
            lpTokens = _sqrt(amount0 * amount1);
        } else {
            // Subsequent: proportional to existing
            uint256 lp0 = (amount0 * totalSupply) / reserve0;
            uint256 lp1 = (amount1 * totalSupply) / reserve1;
            lpTokens = lp0 < lp1 ? lp0 : lp1;
        }
        
        require(lpTokens > 0, "gPool: INSUFFICIENT_LIQUIDITY_MINTED");
        
        // Mint gLP tokens
        balanceOf[msg.sender] += lpTokens;
        totalSupply += lpTokens;
        
        // Update reserves
        _update(reserve0 + amount0, reserve1 + amount1);
        
        emit Mint(msg.sender, amount0, amount1, lpTokens);
    }
    
    /// @notice Remove liquidity, burn gLP tokens, return underlying assets
    function removeLiquidity(uint256 lpTokens) external override lock returns (uint256 amount0, uint256 amount1) {
        require(lpTokens > 0, "gPool: ZERO_AMOUNT");
        require(balanceOf[msg.sender] >= lpTokens, "gPool: INSUFFICIENT_LP");
        
        // Calculate amounts to return
        amount0 = (lpTokens * reserve0) / totalSupply;
        amount1 = (lpTokens * reserve1) / totalSupply;
        
        require(amount0 > 0 && amount1 > 0, "gPool: INSUFFICIENT_LIQUIDITY_BURNED");
        
        // Burn gLP tokens
        balanceOf[msg.sender] -= lpTokens;
        totalSupply -= lpTokens;
        
        // Return underlying tokens
        _transfer(token0, msg.sender, amount0);
        _transfer(token1, msg.sender, amount1);
        
        // Update reserves
        _update(reserve0 - amount0, reserve1 - amount1);
        
        emit Burn(msg.sender, amount0, amount1, lpTokens);
    }
    
    /// @notice Swap tokens with slippage protection
    function swap(
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline
    ) external override lock returns (uint256 amountOut) {
        require(deadline >= block.timestamp, "gPool: EXPIRED");
        require(amountIn > 0, "gPool: INSUFFICIENT_INPUT");
        require(tokenIn == token0 || tokenIn == token1, "gPool: INVALID_TOKEN");
        
        // Determine input/output reserves
        (uint256 reserveIn, uint256 reserveOut, address tokenOut) = tokenIn == token0 
            ? (reserve0, reserve1, token1) 
            : (reserve1, reserve0, token0);
        
        require(reserveIn > 0 && reserveOut > 0, "gPool: INSUFFICIENT_LIQUIDITY");
        
        // Calculate output
        amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        require(amountOut >= minAmountOut, "gPool: INSUFFICIENT_OUTPUT");
        
        // Pull input tokens
        _transferFrom(tokenIn, msg.sender, amountIn);
        
        // Send output tokens
        _transfer(tokenOut, msg.sender, amountOut);
        
        // Update reserves
        if (tokenIn == token0) {
            _update(reserve0 + amountIn, reserve1 - amountOut);
        } else {
            _update(reserve1 + amountIn, reserve0 - amountOut);
        }
        
        emit Swap(msg.sender, amountIn, amountOut, tokenIn, tokenOut);
    }
    
    /// @dev Update reserves and timestamp
    function _update(uint256 _reserve0, uint256 _reserve1) private {
        reserve0 = _reserve0;
        reserve1 = _reserve1;
        blockTimestampLast = uint32(block.timestamp % 2**32);
        emit Sync(_reserve0, _reserve1);
    }
    
    /// @dev Safe ERC20 transfer
    function _transfer(address token, address to, uint256 amount) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(bytes4(keccak256("transfer(address,uint256)")), to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "gPool: TRANSFER_FAILED");
    }
    
    /// @dev Safe ERC20 transferFrom
    function _transferFrom(address token, address from, uint256 amount) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(bytes4(keccak256("transferFrom(address,address,uint256)")), from, address(this), amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "gPool: TRANSFER_FROM_FAILED");
    }
    
    /// @dev Babylonian square root
    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y == 0) return 0;
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
