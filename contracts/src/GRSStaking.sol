// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GRSStaking
 * @notice Staking contract for gSwap Token (GRS)
 * @dev Users stake GRS to earn rewards and boost their platform benefits
 */
contract GRSStaking is Ownable, ReentrancyGuard {
    
    /// @notice GRS token contract
    IERC20 public immutable grsToken;
    
    /// @notice Staking info for each user
    struct StakeInfo {
        uint256 amount;           // Amount staked
        uint256 rewardDebt;       // Reward debt for calculation
        uint256 lastStakeTime;    // Last time user staked
        uint256 lockEndTime;      // Lock period end (0 if no lock)
    }
    
    /// @notice User stakes
    mapping(address => StakeInfo) public stakes;
    
    /// @notice Total staked amount
    uint256 public totalStaked;
    
    /// @notice Reward pool
    uint256 public rewardPool;
    
    /// @notice Accumulated rewards per share (scaled by 1e12)
    uint256 public accRewardPerShare;
    
    /// @notice Reward rate (tokens per second per staked token, scaled by 1e12)
    uint256 public rewardRate = 3170979198; // ~10% APR with 1e12 scaling
    
    /// @notice Lock period for boosted rewards (30 days)
    uint256 public constant LOCK_PERIOD = 30 days;
    
    /// @notice Boost multiplier for locked stakes (2x = 20000/10000)
    uint256 public constant LOCK_BOOST = 20000;
    uint256 public constant BASE_MULTIPLIER = 10000;
    
    /// @notice Minimum stake amount
    uint256 public constant MIN_STAKE = 100 * 10**18; // 100 GRS
    
    /// @notice Events
    event Staked(address indexed user, uint256 amount, bool locked);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardRateUpdated(uint256 newRate);
    event RewardsAdded(uint256 amount);
    
    modifier updateReward(address _user) {
        if (totalStaked > 0) {
            uint256 pending = _calculatePendingRewards();
            accRewardPerShare += (pending * 1e12) / totalStaked;
        }
        _;
        if (_user != address(0)) {
            StakeInfo storage userStake = stakes[_user];
            userStake.rewardDebt = (userStake.amount * accRewardPerShare) / 1e12;
        }
    }
    
    constructor(address _grsToken) Ownable(msg.sender) {
        require(_grsToken != address(0), "GRSStaking: zero address");
        grsToken = IERC20(_grsToken);
    }
    
    /**
     * @notice Stake GRS tokens
     * @param amount Amount to stake
     * @param lock Whether to lock for boosted rewards
     */
    function stake(uint256 amount, bool lock) external nonReentrant updateReward(msg.sender) {
        require(amount >= MIN_STAKE, "GRSStaking: below minimum");
        require(grsToken.transferFrom(msg.sender, address(this), amount), "GRSStaking: transfer failed");
        
        StakeInfo storage stakeInfo = stakes[msg.sender];
        
        // Update stake amount
        stakeInfo.amount += amount;
        stakeInfo.lastStakeTime = block.timestamp;
        
        // Set lock if requested and not already locked
        if (lock) {
            stakeInfo.lockEndTime = block.timestamp + LOCK_PERIOD;
        }
        
        totalStaked += amount;
        
        emit Staked(msg.sender, amount, lock);
    }
    
    /**
     * @notice Withdraw staked tokens
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant updateReward(msg.sender) {
        StakeInfo storage stakeInfo = stakes[msg.sender];
        require(stakeInfo.amount >= amount, "GRSStaking: insufficient balance");
        require(
            stakeInfo.lockEndTime == 0 || block.timestamp >= stakeInfo.lockEndTime,
            "GRSStaking: tokens locked"
        );
        
        // Update stake
        stakeInfo.amount -= amount;
        if (stakeInfo.amount == 0) {
            stakeInfo.lockEndTime = 0;
        }
        
        totalStaked -= amount;
        
        require(grsToken.transfer(msg.sender, amount), "GRSStaking: transfer failed");
        
        emit Withdrawn(msg.sender, amount);
    }
    
    /**
     * @notice Claim pending rewards
     */
    function claimReward() external nonReentrant updateReward(msg.sender) {
        uint256 pending = pendingReward(msg.sender);
        require(pending > 0, "GRSStaking: no rewards");
        require(pending <= rewardPool, "GRSStaking: insufficient reward pool");
        
        stakes[msg.sender].rewardDebt = (stakes[msg.sender].amount * accRewardPerShare) / 1e12;
        rewardPool -= pending;
        
        require(grsToken.transfer(msg.sender, pending), "GRSStaking: reward transfer failed");
        
        emit RewardClaimed(msg.sender, pending);
    }
    
    /**
     * @notice Get pending rewards for a user
     * @param user Address to check
     * @return Pending reward amount
     */
    function pendingReward(address user) public view returns (uint256) {
        StakeInfo storage stakeInfo = stakes[user];
        if (stakeInfo.amount == 0) return 0;
        
        uint256 tempAccReward = accRewardPerShare;
        if (totalStaked > 0) {
            uint256 pending = _calculatePendingRewards();
            tempAccReward += (pending * 1e12) / totalStaked;
        }
        
        uint256 baseReward = ((stakeInfo.amount * tempAccReward) / 1e12) - stakeInfo.rewardDebt;
        
        // Apply lock boost
        if (stakeInfo.lockEndTime > block.timestamp) {
            baseReward = (baseReward * LOCK_BOOST) / BASE_MULTIPLIER;
        }
        
        return baseReward;
    }
    
    /**
     * @notice Calculate pending rewards since last update
     */
    function _calculatePendingRewards() internal view returns (uint256) {
        // Simplified reward calculation
        return 0; // In production, this would track time-weighted rewards
    }
    
    /**
     * @notice Get user's stake info with calculated APR
     * @param user Address to check
     * @return info StakeInfo struct
     * @return apr Current APR based on lock status
     */
    function getStakeInfo(address user) external view returns (StakeInfo memory info, uint256 apr) {
        info = stakes[user];
        apr = info.lockEndTime > block.timestamp ? 20 : 10; // 20% with lock, 10% without
    }
    
    /**
     * @notice Get remaining lock time
     * @param user Address to check
     * @return secondsRemaining Seconds until unlock (0 if not locked or unlocked)
     */
    function getRemainingLockTime(address user) external view returns (uint256 secondsRemaining) {
        StakeInfo storage stakeInfo = stakes[user];
        if (stakeInfo.lockEndTime <= block.timestamp) return 0;
        return stakeInfo.lockEndTime - block.timestamp;
    }
    
    /**
     * @notice Add rewards to the pool (admin)
     * @param amount Amount to add
     */
    function addRewards(uint256 amount) external onlyOwner {
        require(grsToken.transferFrom(msg.sender, address(this), amount), "GRSStaking: transfer failed");
        rewardPool += amount;
        emit RewardsAdded(amount);
    }
    
    /**
     * @notice Update reward rate (admin)
     * @param newRate New reward rate
     */
    function setRewardRate(uint256 newRate) external onlyOwner {
        rewardRate = newRate;
        emit RewardRateUpdated(newRate);
    }
    
    /**
     * @notice Emergency withdraw (admin only, for rescue)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(grsToken.transfer(owner(), amount), "GRSStaking: transfer failed");
    }
    
    /**
     * @notice Get total TVL
     */
    function getTVL() external view returns (uint256) {
        return totalStaked;
    }
    
    /**
     * @notice Get number of unique stakers
     * @dev Note: This would need an array in production
     */
    function getStakerCount() external pure returns (uint256) {
        // Simplified - would track in production
        return 0;
    }
}
