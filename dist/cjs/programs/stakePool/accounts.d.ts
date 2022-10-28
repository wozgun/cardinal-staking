import type { AccountData } from "@cardinal/common";
import type { Connection } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import type { StakePoolData } from ".";
import type { IdentifierData, StakeAuthorizationData, StakeBoosterData, StakeEntryData } from "./constants";
export declare const getStakePool: (connection: Connection, stakePoolId: PublicKey) => Promise<AccountData<StakePoolData>>;
export declare const getStakePools: (connection: Connection, stakePoolIds: PublicKey[]) => Promise<AccountData<StakePoolData>[]>;
export declare const getAllStakePools: (connection: Connection) => Promise<AccountData<StakePoolData>[]>;
export declare const getStakeEntriesForUser: (connection: Connection, user: PublicKey) => Promise<AccountData<StakeEntryData>[]>;
export declare const getAllActiveStakeEntries: (connection: Connection) => Promise<AccountData<StakeEntryData>[]>;
export declare const getAllStakeEntriesForPool: (connection: Connection, stakePoolId: PublicKey) => Promise<AccountData<StakeEntryData>[]>;
export declare const getActiveStakeEntriesForPool: (connection: Connection, stakePoolId: PublicKey) => Promise<AccountData<StakeEntryData>[]>;
export declare const getStakeEntry: (connection: Connection, stakeEntryId: PublicKey) => Promise<AccountData<StakeEntryData>>;
export declare const getStakeEntries: (connection: Connection, stakeEntryIds: PublicKey[]) => Promise<AccountData<StakeEntryData>[]>;
export declare const getPoolIdentifier: (connection: Connection) => Promise<AccountData<IdentifierData>>;
export declare const getStakeAuthorization: (connection: Connection, stakeAuthorizationId: PublicKey) => Promise<AccountData<StakeAuthorizationData>>;
export declare const getStakeAuthorizations: (connection: Connection, stakeAuthorizationIds: PublicKey[]) => Promise<AccountData<StakeAuthorizationData>[]>;
export declare const getStakeAuthorizationsForPool: (connection: Connection, poolId: PublicKey) => Promise<AccountData<StakeAuthorizationData>[]>;
export declare const getStakePoolsByAuthority: (connection: Connection, user: PublicKey) => Promise<AccountData<StakePoolData>[]>;
export declare const getAllStakeEntries: (connection: Connection) => Promise<AccountData<StakeEntryData>[]>;
export declare const getStakeBooster: (connection: Connection, stakeBoosterId: PublicKey) => Promise<AccountData<StakeBoosterData>>;
//# sourceMappingURL=accounts.d.ts.map