"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllGroupRewardEntries =
  exports.getGroupRewardEntriesForGroupRewardDistributor =
  exports.getGroupRewardDistributors =
  exports.getGroupRewardDistributor =
  exports.getGroupRewardEntries =
  exports.getGroupRewardEntry =
  exports.getGroupRewardCounters =
  exports.getGroupRewardCounter =
    void 0;
const anchor_1 = require("@coral-xyz/anchor");
const _1 = require(".");
const constants_1 = require("./constants");
const getGroupRewardCounter = async (
  connection,
  groupRewardCounterId,
  commitment
) => {
  const program = (0, constants_1.groupRewardDistributorProgram)(
    connection,
    undefined,
    {
      commitment,
    }
  );
  const parsed = await program.account.groupRewardCounter.fetch(
    groupRewardCounterId
  );
  return {
    parsed,
    pubkey: groupRewardCounterId,
  };
};
exports.getGroupRewardCounter = getGroupRewardCounter;
const getGroupRewardCounters = async (
  connection,
  groupRewardCounterIds,
  commitment
) => {
  const program = (0, constants_1.groupRewardDistributorProgram)(
    connection,
    undefined,
    {
      commitment,
    }
  );
  const groupRewardCounters =
    await program.account.groupRewardCounter.fetchMultiple(
      groupRewardCounterIds
    );
  return groupRewardCounters.map((entry, i) => ({
    parsed: entry,
    pubkey: groupRewardCounterIds[i],
  }));
};
exports.getGroupRewardCounters = getGroupRewardCounters;
const getGroupRewardEntry = async (
  connection,
  groupRewardEntryId,
  commitment
) => {
  const program = (0, constants_1.groupRewardDistributorProgram)(
    connection,
    undefined,
    {
      commitment,
    }
  );
  const parsed = await program.account.groupRewardEntry.fetch(
    groupRewardEntryId
  );
  return {
    parsed,
    pubkey: groupRewardEntryId,
  };
};
exports.getGroupRewardEntry = getGroupRewardEntry;
const getGroupRewardEntries = async (
  connection,
  groupRewardEntryIds,
  commitment
) => {
  const program = (0, constants_1.groupRewardDistributorProgram)(
    connection,
    undefined,
    {
      commitment,
    }
  );
  const groupRewardEntries =
    await program.account.groupRewardEntry.fetchMultiple(groupRewardEntryIds);
  return groupRewardEntries.map((entry, i) => ({
    parsed: entry,
    pubkey: groupRewardEntryIds[i],
  }));
};
exports.getGroupRewardEntries = getGroupRewardEntries;
const getGroupRewardDistributor = async (
  connection,
  groupRewardDistributorId,
  commitment
) => {
  const program = (0, constants_1.groupRewardDistributorProgram)(
    connection,
    undefined,
    {
      commitment,
    }
  );
  const parsed = await program.account.groupRewardDistributor.fetch(
    groupRewardDistributorId
  );
  return {
    parsed,
    pubkey: groupRewardDistributorId,
  };
};
exports.getGroupRewardDistributor = getGroupRewardDistributor;
const getGroupRewardDistributors = async (
  connection,
  groupRewardDistributorIds,
  commitment
) => {
  const program = (0, constants_1.groupRewardDistributorProgram)(
    connection,
    undefined,
    {
      commitment,
    }
  );
  const groupRewardDistributors =
    await program.account.groupRewardDistributor.fetchMultiple(
      groupRewardDistributorIds
    );
  return groupRewardDistributors.map((distributor, i) => ({
    parsed: distributor,
    pubkey: groupRewardDistributorIds[i],
  }));
};
exports.getGroupRewardDistributors = getGroupRewardDistributors;
const getGroupRewardEntriesForGroupRewardDistributor = async (
  connection,
  groupRewardDistributorId,
  commitment
) => {
  const programAccounts = await connection.getProgramAccounts(
    _1.GROUP_REWARD_DISTRIBUTOR_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: anchor_1.utils.bytes.bs58.encode(
              anchor_1.BorshAccountsCoder.accountDiscriminator(
                "groupRewardEntry"
              )
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
  const coder = new anchor_1.BorshAccountsCoder(
    _1.GROUP_REWARD_DISTRIBUTOR_IDL
  );
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
exports.getGroupRewardEntriesForGroupRewardDistributor =
  getGroupRewardEntriesForGroupRewardDistributor;
const getAllGroupRewardEntries = async (connection, commitment) => {
  const programAccounts = await connection.getProgramAccounts(
    _1.GROUP_REWARD_DISTRIBUTOR_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: anchor_1.utils.bytes.bs58.encode(
              anchor_1.BorshAccountsCoder.accountDiscriminator(
                "groupRewardEntry"
              )
            ),
          },
        },
      ],
      commitment,
    }
  );
  const groupRewardEntryDatas = [];
  const coder = new anchor_1.BorshAccountsCoder(
    _1.GROUP_REWARD_DISTRIBUTOR_IDL
  );
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
exports.getAllGroupRewardEntries = getAllGroupRewardEntries;
//# sourceMappingURL=accounts.js.map
