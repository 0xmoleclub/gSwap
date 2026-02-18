import * as p from '@subsquid/evm-codec'
import { fun, viewFun, ContractBase } from '@subsquid/evm-abi'
import type { FunctionReturn } from '@subsquid/evm-abi'

export const functions = {
    name: viewFun("0x06fdde03", "name()", {}, p.string),
    symbol: viewFun("0x95d89b41", "symbol()", {}, p.string),
    decimals: viewFun("0x313ce567", "decimals()", {}, p.uint8),
}

export class Contract extends ContractBase {
    name() {
        return this.eth_call(functions.name, {})
    }

    symbol() {
        return this.eth_call(functions.symbol, {})
    }

    decimals() {
        return this.eth_call(functions.decimals, {})
    }
}
