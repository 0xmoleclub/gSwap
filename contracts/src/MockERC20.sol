// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @notice Mock ERC20 using OpenZeppelin
 * @dev Anyone can mint tokens for testing purposes
 */
contract MockERC20 is ERC20 {
    
    uint8 private _decimals;
    
    /// @notice Mint event for tracking
    event PublicMint(address indexed to, uint256 amount);
    
    /**
     * @notice Deploy mock token
     * @param name Token name
     * @param symbol Token symbol  
     * @param decimals_ Token decimals (usually 18, USDC is 6)
     * @param initialSupply Initial supply to mint to deployer (can be 0)
     */
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _decimals = decimals_;
        
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
    }
    
    /**
     * @notice Public mint - anyone can mint tokens for testing
     * @param to Address to mint tokens to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        require(to != address(0), "MockERC20: zero address");
        require(amount > 0, "MockERC20: zero amount");
        _mint(to, amount);
        emit PublicMint(to, amount);
    }
    
    /**
     * @notice Mint tokens to yourself
     * @param amount Amount to mint
     */
    function mintSelf(uint256 amount) external {
        _mint(msg.sender, amount);
        emit PublicMint(msg.sender, amount);
    }
    
    /**
     * @notice Get free tokens for testing (10,000 tokens)
     */
    function faucet() external {
        uint256 amount = 10000 * 10 ** _decimals;
        _mint(msg.sender, amount);
        emit PublicMint(msg.sender, amount);
    }
    
    /**
     * @notice Burn tokens
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    
    /**
     * @notice Get token decimals
     */
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}
