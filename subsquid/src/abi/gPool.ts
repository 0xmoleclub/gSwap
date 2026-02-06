import * as p from '@subsquid/evm-codec'
import { event, fun, viewFun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    Swap: event("0x053d794b2310b8d186a24ae24a65ee066983a52a6efa6bd3df09a7601a3cb4f3", "Swap(address,uint256,uint256,address,address)", {"sender": indexed(p.address), "amountIn": p.uint256, "amountOut": p.uint256, "tokenIn": indexed(p.address), "tokenOut": indexed(p.address)}),
    Mint: event("0xb4c03061fb5b7fed76389d5af8f2e0ddb09f8c70d1333abbb62582835e10accb", "Mint(address,uint256,uint256,uint256)", {"sender": indexed(p.address), "amount0": p.uint256, "amount1": p.uint256, "lpTokens": p.uint256}),
    Burn: event("0x743033787f4738ff4d6a7225ce2bd0977ee5f86b91a902a58f5e4d0b297b4644", "Burn(address,uint256,uint256,uint256)", {"sender": indexed(p.address), "amount0": p.uint256, "amount1": p.uint256, "lpTokens": p.uint256}),
    Sync: event("0xcf2aa50876cdfbb541206f89af0ee78d44a2abf8d328e37fa4917f982149848a", "Sync(uint256,uint256)", {"reserve0": p.uint256, "reserve1": p.uint256}),
}

export class Contract extends ContractBase {
}

/// Event types
export type SwapEventArgs = EParams<typeof events.Swap>
export type MintEventArgs = EParams<typeof events.Mint>
export type BurnEventArgs = EParams<typeof events.Burn>
export type SyncEventArgs = EParams<typeof events.Sync>
