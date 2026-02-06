import * as p from '@subsquid/evm-codec'
import { event, fun, viewFun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    PoolCreated: event("0xebbbe9dc3a19d2f959ac76ac0372b4983cdfb945f5d6aef4873c36fabb2ba8aa", "PoolCreated(address,address,address,uint256)", {"pool": indexed(p.address), "token0": indexed(p.address), "token1": indexed(p.address), "poolIndex": p.uint256}),
}

export class Contract extends ContractBase {
}

/// Event types
export type PoolCreatedEventArgs = EParams<typeof events.PoolCreated>
