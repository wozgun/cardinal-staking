import {
  AnchorProvider,
  BorshAccountsCoder,
  Program,
  utils,
} from "@project-serum/anchor";
import { SignerWallet } from "@saberhq/solana-contrib";
import { Keypair } from "@solana/web3.js";
import { REWARD_DISTRIBUTOR_ADDRESS, REWARD_DISTRIBUTOR_IDL } from ".";
const getProgram = (connection) => {
  const provider = new AnchorProvider(
    connection,
    new SignerWallet(Keypair.generate()),
    {}
  );
  return new Program(
    REWARD_DISTRIBUTOR_IDL,
    REWARD_DISTRIBUTOR_ADDRESS,
    provider
  );
};
export const getRewardEntry = async (connection, rewardEntryId) => {
  const rewardDistributorProgram = getProgram(connection);
  const parsed = await rewardDistributorProgram.account.rewardEntry.fetch(
    rewardEntryId
  );
  return {
    parsed,
    pubkey: rewardEntryId,
  };
};
export const getRewardEntries = async (connection, rewardEntryIds) => {
  const rewardDistributorProgram = getProgram(connection);
  const rewardEntries =
    await rewardDistributorProgram.account.rewardEntry.fetchMultiple(
      rewardEntryIds
    );
  return rewardEntries.map((entry, i) => ({
    parsed: entry,
    pubkey: rewardEntryIds[i],
  }));
};
export const getRewardDistributor = async (connection, rewardDistributorId) => {
  const rewardDistributorProgram = getProgram(connection);
  const parsed = await rewardDistributorProgram.account.rewardDistributor.fetch(
    rewardDistributorId
  );
  return {
    parsed,
    pubkey: rewardDistributorId,
  };
};
export const getRewardDistributors = async (
  connection,
  rewardDistributorIds
) => {
  const rewardDistributorProgram = getProgram(connection);
  const rewardDistributors =
    await rewardDistributorProgram.account.rewardDistributor.fetchMultiple(
      rewardDistributorIds
    );
  return rewardDistributors.map((distributor, i) => ({
    parsed: distributor,
    pubkey: rewardDistributorIds[i],
  }));
};
export const getRewardEntriesForRewardDistributor = async (
  connection,
  rewardDistributorId
) => {
  const programAccounts = await connection.getProgramAccounts(
    REWARD_DISTRIBUTOR_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: utils.bytes.bs58.encode(
              BorshAccountsCoder.accountDiscriminator("rewardEntry")
            ),
          },
        },
        {
          memcmp: {
            offset: 41,
            bytes: rewardDistributorId.toBase58(),
          },
        },
      ],
    }
  );
  const rewardEntryDatas = [];
  const coder = new BorshAccountsCoder(REWARD_DISTRIBUTOR_IDL);
  programAccounts.forEach((account) => {
    try {
      const rewardEntryData = coder.decode("rewardEntry", account.account.data);
      if (rewardEntryData) {
        rewardEntryDatas.push({
          ...account,
          parsed: rewardEntryData,
        });
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
  });
  return rewardEntryDatas.sort((a, b) =>
    a.pubkey.toBase58().localeCompare(b.pubkey.toBase58())
  );
};
export const getAllRewardEntries = async (connection) => {
  const programAccounts = await connection.getProgramAccounts(
    REWARD_DISTRIBUTOR_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: utils.bytes.bs58.encode(
              BorshAccountsCoder.accountDiscriminator("rewardEntry")
            ),
          },
        },
      ],
    }
  );
  const rewardEntryDatas = [];
  const coder = new BorshAccountsCoder(REWARD_DISTRIBUTOR_IDL);
  programAccounts.forEach((account) => {
    try {
      const rewardEntryData = coder.decode("rewardEntry", account.account.data);
      if (rewardEntryData) {
        rewardEntryDatas.push({
          ...account,
          parsed: rewardEntryData,
        });
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
  });
  return rewardEntryDatas.sort((a, b) =>
    a.pubkey.toBase58().localeCompare(b.pubkey.toBase58())
  );
};
//# sourceMappingURL=accounts.js.map