import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_, IntColumn as IntColumn_, OneToMany as OneToMany_, BigIntColumn as BigIntColumn_} from "@subsquid/typeorm-store"
import {Pool} from "./pool.model"

@Entity_()
export class Factory {
    constructor(props?: Partial<Factory>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_({unique: true})
    @StringColumn_({nullable: false})
    address!: string

    @IntColumn_({nullable: false})
    poolCount!: number

    @OneToMany_(() => Pool, e => e.factory)
    pools!: Pool[]

    @BigIntColumn_({nullable: false})
    totalVolumeUSD!: bigint

    @BigIntColumn_({nullable: false})
    totalFeesUSD!: bigint
}
