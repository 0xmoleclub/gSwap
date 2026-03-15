// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockGRS
 * @notice gSwap Platform Token (GRS) - Governance and utility token
 * @dev Holders get reduced fees, staking rewards, and airdrop eligibility
 */
contract MockGRS is ERC20, Ownable {
    
    /// @notice Staking contract address
    address public stakingContract;
    
    /// @notice Fee discount tiers based on GRS holdings
    uint256 public constant TIER1_THRESHOLD = 1000 * 10**18;   // 1,000 GRS = 5% discount
    uint256 public constant TIER2_THRESHOLD = 10000 * 10**18;  // 10,000 GRS = 10% discount
    uint256 public constant TIER3_THRESHOLD = 100000 * 10**18; // 100,000 GRS = 25% discount
    
    /// @notice Events
    event StakingContractSet(address indexed stakingContract);
    event PublicMint(address indexed to, uint256 amount);
    
    /**
     * @notice Deploy GRS token
     * @param initialSupply Initial supply to mint to deployer
     */
    constructor(uint256 initialSupply) ERC20("gSwap Token", "GRS") Ownable(msg.sender) {
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
    }
    
    /**
     * @notice Set the staking contract address
     * @param _stakingContract Address of the staking contract
     */
    function setStakingContract(address _stakingContract) external onlyOwner {
        require(_stakingContract != address(0), "GRS: zero address");
        stakingContract = _stakingContract;
        emit StakingContractSet(_stakingContract);
    }
    
    /**
     * @notice Public mint for testing - anyone can get free GRS
     * @param to Address to mint tokens to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        require(to != address(0), "GRS: zero address");
        require(amount > 0, "GRS: zero amount");
        _mint(to, amount);
        emit PublicMint(to, amount);
    }
    
    /**
     * @notice Mint tokens to yourself for testing (5,000 GRS)
     */
    function faucet() external {
        uint256 amount = 5000 * 10**18;
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
     * @notice Get fee discount percentage based on holdings
     * @param account Address to check
     * @return discountPercentage Fee discount (0, 5, 10, or 25)
     */
    function getFeeDiscount(address account) external view returns (uint256 discountPercentage) {
        uint256 balance = balanceOf(account);
        
        if (balance >= TIER3_THRESHOLD) {
            return 25; // 25% discount
        } else if (balance >= TIER2_THRESHOLD) {
            return 10; // 10% discount
        } else if (balance >= TIER1_THRESHOLD) {
            return 5;  // 5% discount
        }
        return 0; // No discount
    }
    
    /**
     * @notice Get the tier name for an account
     * @param account Address to check
     * @return tier Tier name (None, Silver, Gold, Platinum)
     */
    function getTier(address account) external view returns (string memory tier) {
        uint256 balance = balanceOf(account);
        
        if (balance >= TIER3_THRESHOLD) {
            return "Platinum";
        } else if (balance >= TIER2_THRESHOLD) {
            return "Gold";
        } else if (balance >= TIER1_THRESHOLD) {
            return "Silver";
        }
        return "None";
    }
    
    /**
     * @notice Check if account is eligible for airdrops
     * @param account Address to check
     * @return eligible True if eligible (holds at least 1,000 GRS)
     */
    function isAirdropEligible(address account) external view returns (bool eligible) {
        return balanceOf(account) >= TIER1_THRESHOLD;
    }
    
    /**
     * @notice Override decimals to use 18
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
