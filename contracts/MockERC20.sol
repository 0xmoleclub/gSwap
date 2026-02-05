// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockERC20
 * @notice Minimal ERC20 for testing gSwap DEX
 * @dev Anyone can mint tokens for testing purposes
 */
contract MockERC20 {
    
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event PublicMint(address indexed to, uint256 amount);
    
    /**
     * @notice Deploy mock token
     * @param name_ Token name
     * @param symbol_ Token symbol  
     * @param decimals_ Token decimals (18 for most, 6 for USDC)
     * @param initialSupply Initial supply to mint to deployer (can be 0)
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply
    ) {
        name = name_;
        symbol = symbol_;
        decimals = decimals_;
        
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
        uint256 amount = 10000 * 10 ** decimals;
        _mint(msg.sender, amount);
        emit PublicMint(msg.sender, amount);
    }
    
    /**
     * @notice Burn your own tokens
     */
    function burn(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "MockERC20: insufficient balance");
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }
    
    /**
     * @notice Standard ERC20 transfer
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "MockERC20: insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    /**
     * @notice Standard ERC20 approve
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    /**
     * @notice Standard ERC20 transferFrom
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "MockERC20: insufficient balance");
        require(allowance[from][msg.sender] >= amount, "MockERC20: insufficient allowance");
        
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
    
    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}
