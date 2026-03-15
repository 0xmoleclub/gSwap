// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../src/MockERC20.sol";

/**
 * @title MintTokens
 * @notice Mint all gSwap tokens to a specified wallet for arbitrage testing
 * @dev Run with: forge script script/MintTokens.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
 */
contract MintTokens is Script {
    
    // Token addresses from latest deployment (run-latest.json)
    address constant USDC = 0xc394f94c7b93ae269f7aabdeca736a7b7768a388;
    address constant USDT = 0x375b3ee0cfc16fad04b2b8df2fa48c3565320a5b;
    address constant DAI = 0xd949eb9f942966c6f390bb07c56321bd516ad70b;
    address constant WETH = 0x8e86b14abc9e8f56c21a8ee26e8253b5658a9c7d;
    address constant WBTC = 0xd99aaecb8030b713f35065c1ef11a1e038620a41;
    address constant LINK = 0xfa27886c7395e48d4dad4f5f50b7bbbcbca85d93;
    address constant UNI = 0x91d70e24969efa48fd8c6878c817e3d96ba5f360;
    address constant AAVE = 0x14a8ea0630114b68fc3975299a8f41067c798aed;
    address constant COMP = 0xa85d8219db815e5285605935c7863fdc3e1dc3c8;
    address constant MKR = 0x38b29434dda8bace3d7239bd7fed37d8f45d1475;
    address constant SHIB = 0x630ebd205b5a5c10145a044f89acfd04e0286e69;
    address constant PEPE = 0xc81316ee60d28f9602f4bff4a809520d4865cdc1;
    address constant SUSHI = 0x93bcd3e0710d20e2c1a106acecfefbd4ee1bc9f8;
    address constant CRV = 0x04d96680693a273f370b631dcc5dec6f6f9041bb;
    address constant LDO = 0x44e0eab8683667dda8dc7eaeecf9ce351aa8704e;

    // Mint amounts for each token type
    uint256 constant MINT_AMOUNT_STABLE = 10_000_000 * 10**6;    // 10M USDC/USDT (6 decimals)
    uint256 constant MINT_AMOUNT_DAI = 10_000_000 * 10**18;      // 10M DAI (18 decimals)
    uint256 constant MINT_AMOUNT_WETH = 5_000 * 10**18;          // 5,000 WETH
    uint256 constant MINT_AMOUNT_WBTC = 100 * 10**8;             // 100 WBTC (8 decimals)
    uint256 constant MINT_AMOUNT_ALTCOIN = 1_000_000 * 10**18;   // 1M tokens (18 decimals)

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address targetWallet = vm.envAddress("TARGET_WALLET");
        
        console.log("========================================");
        console.log("gSwap Token Minting Script");
        console.log("========================================");
        console.log(string.concat("Target Wallet: ", vm.toString(targetWallet)));
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Mint Stablecoins
        console.log("Minting Stablecoins...");
        _mintToken(USDC, targetWallet, MINT_AMOUNT_STABLE, "USDC");
        _mintToken(USDT, targetWallet, MINT_AMOUNT_STABLE, "USDT");
        _mintToken(DAI, targetWallet, MINT_AMOUNT_DAI, "DAI");
        
        // Mint Major Cryptos
        console.log("Minting Major Cryptos...");
        _mintToken(WETH, targetWallet, MINT_AMOUNT_WETH, "WETH");
        _mintToken(WBTC, targetWallet, MINT_AMOUNT_WBTC, "WBTC");
        
        // Mint Altcoins
        console.log("Minting Altcoins...");
        _mintToken(LINK, targetWallet, MINT_AMOUNT_ALTCOIN, "LINK");
        _mintToken(UNI, targetWallet, MINT_AMOUNT_ALTCOIN, "UNI");
        _mintToken(AAVE, targetWallet, MINT_AMOUNT_ALTCOIN, "AAVE");
        _mintToken(COMP, targetWallet, MINT_AMOUNT_ALTCOIN, "COMP");
        _mintToken(MKR, targetWallet, MINT_AMOUNT_ALTCOIN, "MKR");
        _mintToken(SHIB, targetWallet, MINT_AMOUNT_ALTCOIN, "SHIB");
        _mintToken(PEPE, targetWallet, MINT_AMOUNT_ALTCOIN, "PEPE");
        _mintToken(SUSHI, targetWallet, MINT_AMOUNT_ALTCOIN, "SUSHI");
        _mintToken(CRV, targetWallet, MINT_AMOUNT_ALTCOIN, "CRV");
        _mintToken(LDO, targetWallet, MINT_AMOUNT_ALTCOIN, "LDO");
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("========================================");
        console.log("Minting Complete!");
        console.log("========================================");
        console.log("All tokens minted to target wallet.");
        console.log("The arbitrage agent can now trade with these funds.");
    }
    
    function _mintToken(address token, address to, uint256 amount, string memory symbol) internal {
        MockERC20(token).mint(to, amount);
        console.log(string.concat("  ", symbol, ": ", vm.toString(amount), " tokens minted"));
    }
}
