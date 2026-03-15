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
    
    // Token addresses from latest deployment (run-latest.json) - with proper checksums
    address constant USDC = 0xc394f94c7B93AE269F7AABDeca736A7b7768a388;
    address constant USDT = 0x375b3Ee0CfC16FaD04b2b8DF2fa48C3565320A5B;
    address constant DAI = 0xD949EB9F942966C6F390bb07c56321BD516aD70b;
    address constant WETH = 0x8e86B14Abc9e8F56C21A8eE26e8253b5658a9C7d;
    address constant WBTC = 0xd99AaeCB8030B713F35065c1ef11a1e038620A41;
    address constant LINK = 0xfA27886C7395e48d4dAD4f5f50B7bBbcbCA85d93;
    address constant UNI = 0x91D70E24969efa48fd8C6878c817e3D96bA5f360;
    address constant AAVE = 0x14a8Ea0630114b68Fc3975299A8f41067c798Aed;
    address constant COMP = 0xa85D8219Db815e5285605935c7863FdC3E1Dc3C8;
    address constant MKR = 0x38B29434dda8BaCe3d7239bD7FEd37d8f45d1475;
    address constant SHIB = 0x630ebd205b5A5c10145a044f89ACfd04E0286E69;
    address constant PEPE = 0xC81316ee60D28f9602F4bFF4a809520D4865CDC1;
    address constant SUSHI = 0x93bCD3E0710d20E2c1a106aCecfEfbd4ee1bc9f8;
    address constant CRV = 0x04d96680693a273f370b631DCC5Dec6f6F9041bB;
    address constant LDO = 0x44E0eAb8683667dDa8DC7eaEEcf9ce351aa8704e;

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
