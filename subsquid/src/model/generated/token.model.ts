import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_, IntColumn as IntColumn_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {Pool} from "./pool.model"

@Entity_()
export class Token {
    constructor(props?: Partial<Token>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_({unique: true})
    @StringColumn_({nullable: false})
    address!: string

    @StringColumn_({nullable: true})
    symbol!: string | undefined | null

    @StringColumn_({nullable: true})
    name!: string | undefined | null

    @IntColumn_({nullable: true})
    decimals!: number | undefined | null

    @OneToMany_(() => Pool, e => e.token0)
    pools0!: Pool[]

    @OneToMany_(() => Pool, e => e.token1)
    pools1!: Pool[]

    @IntColumn_({nullable: false})
    totalPools!: number
}
