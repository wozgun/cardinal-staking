import { BorshAccountsCoder, utils } from "@coral-xyz/anchor";
import {
  GROUP_REWARD_DISTRIBUTOR_ADDRESS,
  GROUP_REWARD_DISTRIBUTOR_IDL,
} from ".";
import { groupRewardDistributorProgram } from "./constants";
export const getGroupRewardCounter = async (
  connection,
  groupRewardCounterId,
  commitment
) => {
  const program = groupRewardDistributorProgram(connection, undefined, {
    commitment,
  });
  const parsed = await program.account.groupRewardCounter.fetch(
    groupRewardCounterId
  );
  return {
    parsed,
    pubkey: groupRewardCounterId,
  };
};
export const getGroupRewardCounters = async (
  connection,
  groupRewardCounterIds,
  commitment
) => {
  const program = groupRewardDistributorProgram(connection, undefined, {
    commitment,
  });
  const groupRewardCounters =
    await program.account.groupRewardCounter.fetchMultiple(
      groupRewardCounterIds
    );
  return groupRewardCounters.map((entry, i) => ({
    parsed: entry,
    pubkey: groupRewardCounterIds[i],
  }));
};
export const getGroupRewardEntry = async (
  connection,
  groupRewardEntryId,
  commitment
) => {
  const program = groupRewardDistributorProgram(connection, undefined, {
    commitment,
  });
  const parsed = await program.account.groupRewardEntry.fetch(
    groupRewardEntryId
  );
  return {
    parsed,
    pubkey: groupRewardEntryId,
  };
};
export const getGroupRewardEntries = async (
  connection,
  groupRewardEntryIds,
  commitment
) => {
  const program = groupRewardDistributorProgram(connection, undefined, {
    commitment,
  });
  const groupRewardEntries =
    await program.account.groupRewardEntry.fetchMultiple(groupRewardEntryIds);
  return groupRewardEntries.map((entry, i) => ({
    parsed: entry,
    pubkey: groupRewardEntryIds[i],
  }));
};
export const getGroupRewardDistributor = async (
  connection,
  groupRewardDistributorId,
  commitment
) => {
  const program = groupRewardDistributorProgram(connection, undefined, {
    commitment,
  });
  const parsed = await program.account.groupRewardDistributor.fetch(
    groupRewardDistributorId
  );
  return {
    parsed,
    pubkey: groupRewardDistributorId,
  };
};
export const getGroupRewardDistributors = async (
  connection,
  groupRewardDistributorIds,
  commitment
) => {
  const program = groupRewardDistributorProgram(connection, undefined, {
    commitment,
  });
  const groupRewardDistributors =
    await program.account.groupRewardDistributor.fetchMultiple(
      groupRewardDistributorIds
    );
  return groupRewardDistributors.map((distributor, i) => ({
    parsed: distributor,
    pubkey: groupRewardDistributorIds[i],
  }));
};
export const getGroupRewardEntriesForGroupRewardDistributor = async (
  connection,
  groupRewardDistributorId,
  commitment
) => {
  const programAccounts = await connection.getProgramAccounts(
    GROUP_REWARD_DISTRIBUTOR_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: utils.bytes.bs58.encode(
              BorshAccountsCoder.accountDiscriminator("groupRewardEntry")
            ),
          },
        },
        {
          memcmp: {
            offset: 8 + 1 + 32,
            bytes: groupRewardDistributorId.toBase58(),
          },
        },
      ],
      commitment,
    }
  );
  const groupRewardEntryDatas = [];
  const coder = new BorshAccountsCoder(GROUP_REWARD_DISTRIBUTOR_IDL);
  programAccounts.forEach((account) => {
    try {
      const groupRewardEntryData = coder.decode(
        "groupRewardEntry",
        account.account.data
      );
      if (groupRewardEntryData) {
        groupRewardEntryDatas.push({
          ...account,
          parsed: groupRewardEntryData,
        });
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
  });
  return groupRewardEntryDatas.sort((a, b) =>
    a.pubkey.toBase58().localeCompare(b.pubkey.toBase58())
  );
};
export const getAllGroupRewardEntries = async (connection, commitment) => {
  const programAccounts = await connection.getProgramAccounts(
    GROUP_REWARD_DISTRIBUTOR_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: utils.bytes.bs58.encode(
              BorshAccountsCoder.accountDiscriminator("groupRewardEntry")
            ),
          },
        },
      ],
      commitment,
    }
  );
  const groupRewardEntryDatas = [];
  const coder = new BorshAccountsCoder(GROUP_REWARD_DISTRIBUTOR_IDL);
  programAccounts.forEach((account) => {
    try {
      const groupRewardEntryData = coder.decode(
        "groupRewardEntry",
        account.account.data
      );
      if (groupRewardEntryData) {
        groupRewardEntryDatas.push({
          ...account,
          parsed: groupRewardEntryData,
        });
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
  });
  return groupRewardEntryDatas.sort((a, b) =>
    a.pubkey.toBase58().localeCompare(b.pubkey.toBase58())
  );
};
//# sourceMappingURL=accounts.js.map
