import type { AnchorTypes } from "@saberhq/anchor-contrib";
import { PublicKey } from "@solana/web3.js";

import * as REWARD_DISTRIBUTOR_TYPES from "../../idl/cardinal_reward_distributor";

export const REWARD_DISTRIBUTOR_ADDRESS = new PublicKey(
  "6566pw1vumw5aw7FKX2iFydBzAF1ubuzPcGxH4vUD5XN"
);
export const REWARD_MANAGER = new PublicKey(
  "crkdpVWjHWdggGgBuSyAqSmZUmAjYLzD435tcLDRLXr"
);

export const REWARD_ENTRY_SEED = "reward-entry";

export const REWARD_DISTRIBUTOR_SEED = "reward-distributor";

export type REWARD_DISTRIBUTOR_PROGRAM =
  REWARD_DISTRIBUTOR_TYPES.CardinalRewardDistributor;

export const REWARD_DISTRIBUTOR_IDL = REWARD_DISTRIBUTOR_TYPES.IDL;

export type RewardDistributorTypes = AnchorTypes<REWARD_DISTRIBUTOR_PROGRAM>;

type Accounts = RewardDistributorTypes["Accounts"];
export type RewardEntryData = Accounts["rewardEntry"];
export type RewardDistributorData = Accounts["rewardDistributor"];

export enum RewardDistributorKind {
  Mint = 1,
  Treasury = 2,
}
